/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { REPO_ROOT } from '@kbn/repo-info';
import type { CoverageAtBase } from './test/vendor_api/exemptions';
import { findLostCoverage, vendorApiExemptionsSchema } from './test/vendor_api/exemptions';
import type { FoundConnector } from './test/vendor_api/find_connector';
import { listConnectors } from './test/vendor_api/find_connector';
import { updateVendorApi } from './test/vendor_api/update_vendor_api';

const PACKAGE_DIR = path.resolve(__dirname, '..');
const SPECS_DIR = path.join(__dirname, 'specs');
const EXEMPTIONS = path.join(PACKAGE_DIR, 'vendor_api_exemptions.json');
const SCRIPT = 'node scripts/connector_vendor_api';
const RECORDING_TIMEOUT = 120_000;

const readExemptions = (json: string) => vendorApiExemptionsSchema.parse(JSON.parse(json));
const hasManifest = ({ directory }: FoundConnector) =>
  fs.existsSync(path.join(directory, 'manifest.json'));
const relative = (file: string) => path.relative(REPO_ROOT, file);

const git = (...args: string[]): string | undefined => {
  try {
    return execFileSync('git', args, { cwd: REPO_ROOT, encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch {
    return undefined;
  }
};

// CI sets GITHUB_PR_MERGE_BASE on pull requests; locally, the merge base with main is used.
const findMergeBase = (): string | undefined => {
  const base =
    process.env.GITHUB_PR_MERGE_BASE?.trim() ||
    ['upstream/main', 'origin/main']
      .map((ref) => git('merge-base', 'HEAD', ref))
      .find((found) => found !== undefined);
  // Without the commit, as in a shallow clone, every connector would look new.
  return base && git('cat-file', '-e', `${base}^{commit}`) !== undefined ? base : undefined;
};
const mergeBase = findMergeBase();

const existsAtBase = (base: string, file: string) =>
  git('cat-file', '-e', `${base}:${relative(file)}`) !== undefined;

describe('vendor API contract', () => {
  let connectors: FoundConnector[];
  let exemptions: Record<string, string>;

  beforeAll(async () => {
    connectors = await listConnectors();
    exemptions = readExemptions(fs.readFileSync(EXEMPTIONS, 'utf8'));
  });

  it('never has both vendor_api artifacts and an exemption, or exempts unknown connectors', () => {
    const both = connectors
      .filter((found) => hasManifest(found) && found.connector.metadata.id in exemptions)
      .map(
        ({ connector, directory }) =>
          `${connector.metadata.id}: has ${relative(
            directory
          )} and an exemption; remove the exemption`
      );
    const ids = new Set(connectors.map(({ connector }) => connector.metadata.id));
    const unknown = Object.keys(exemptions)
      .filter((id) => !ids.has(id))
      .map(
        (id) => `${id}: is exempted in vendor_api_exemptions.json, but no connector has that id`
      );

    expect([...both, ...unknown]).toEqual([]);
  });

  (mergeBase ? it : it.skip)(
    'keeps vendor API coverage from shrinking since the merge base',
    () => {
      const base = mergeBase as string;
      const atBase = ({ directory }: FoundConnector): CoverageAtBase => {
        if (existsAtBase(base, path.join(directory, 'manifest.json'))) {
          return 'recorded';
        }
        return existsAtBase(base, path.dirname(directory)) ? 'unrecorded' : 'new';
      };
      const lost = findLostCoverage(
        connectors.map((found) => ({
          id: found.connector.metadata.id,
          recorded: hasManifest(found),
          exempt: found.connector.metadata.id in exemptions,
          atBase: atBase(found),
        }))
      );

      expect(
        lost.map(({ id, atBase: before }) =>
          before === 'recorded'
            ? `${id}: had vendor_api artifacts at the merge base; restore them, since coverage may only grow`
            : `${id}: is a new connector without vendor_api artifacts; run ${SCRIPT} --connector ${id} --source <name>=<url>, or exempt it in vendor_api_exemptions.json if it doesn't call an HTTP API`
        )
      ).toEqual([]);
    }
  );

  describe('recorded artifacts', () => {
    // Listed synchronously for it.each, and recursively, since connectors can be nested (atlassian/jira-cloud).
    const recorded = fs
      .readdirSync(SPECS_DIR, { recursive: true, encoding: 'utf8' })
      .filter(
        (file) =>
          path.basename(file) === 'manifest.json' &&
          path.basename(path.dirname(file)) === 'vendor_api'
      )
      .map((file) => path.dirname(path.dirname(file)))
      .sort();

    it.each(recorded)(
      '%s re-records offline without problems or changes',
      async (name) => {
        const found = connectors.find(
          ({ directory }) => directory === path.join(SPECS_DIR, name, 'vendor_api')
        );
        if (!found) {
          throw new Error(`specs/${name}/vendor_api belongs to no connector in all_specs.ts`);
        }
        const { changed, problems } = await updateVendorApi({
          connector: found.connector,
          directory: found.directory,
          check: true,
          fetchText: async (url) => {
            throw new Error(`The contract test runs offline, but tried to fetch ${url}`);
          },
          now: () => new Date(0),
          log: { info: () => {}, warning: () => {} },
        });

        const { id } = found.connector.metadata;
        expect({
          problems,
          outOfDate: changed.map(
            (file) => `${file}: out of date; run ${SCRIPT} --connector ${id} and commit the result`
          ),
        }).toEqual({ problems: [], outOfDate: [] });
      },
      RECORDING_TIMEOUT
    );
  });
});
