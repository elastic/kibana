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
import { findAddedExemptions, vendorApiExemptionsSchema } from './test/vendor_api/exemptions';
import type { FoundConnector } from './test/vendor_api/find_connector';
import { listConnectors } from './test/vendor_api/find_connector';
import { updateVendorApi } from './test/vendor_api/update_vendor_api';

const PACKAGE_DIR = path.resolve(__dirname, '..');
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
const mergeBase =
  process.env.GITHUB_PR_MERGE_BASE?.trim() ||
  ['upstream/main', 'origin/main']
    .map((ref) => git('merge-base', 'HEAD', ref))
    .find((base) => base !== undefined);

const existsAtBase = (base: string, file: string) =>
  git('cat-file', '-e', `${base}:${relative(file)}`) !== undefined;

describe('vendor API contract', () => {
  let connectors: FoundConnector[];
  let exemptions: Record<string, string>;

  beforeAll(async () => {
    connectors = await listConnectors();
    exemptions = readExemptions(fs.readFileSync(EXEMPTIONS, 'utf8'));
  });

  it('has vendor_api artifacts or an exemption for every connector, never both', () => {
    const failures = connectors.flatMap((found) => {
      const { id } = found.connector.metadata;
      if (hasManifest(found) === id in exemptions) {
        return hasManifest(found)
          ? [`${id}: has ${relative(found.directory)} and an exemption; remove the exemption`]
          : [
              `${id}: has no ${relative(
                found.directory
              )}/manifest.json; run ${SCRIPT} --connector ${id} --source <name>=<url>, or exempt it in vendor_api_exemptions.json with a reason`,
            ];
      }
      return [];
    });
    const ids = new Set(connectors.map(({ connector }) => connector.metadata.id));
    const unknown = Object.keys(exemptions)
      .filter((id) => !ids.has(id))
      .map(
        (id) => `${id}: is exempted in vendor_api_exemptions.json, but no connector has that id`
      );

    expect([...failures, ...unknown]).toEqual([]);
  });

  (mergeBase ? it : it.skip)(
    'only exempts connectors that were exempted at the merge base, or are new',
    () => {
      const base = mergeBase as string;
      // The list is seeded along with this test, so it only ratchets once the test is in main.
      const before = existsAtBase(base, __filename)
        ? git('show', `${base}:${relative(EXEMPTIONS)}`)
        : undefined;
      const previous = before === undefined ? exemptions : readExemptions(before);
      const isNewConnector = (id: string) => {
        const found = connectors.find(({ connector }) => connector.metadata.id === id);
        return found !== undefined && !existsAtBase(base, path.dirname(found.directory));
      };

      expect(
        findAddedExemptions(previous, exemptions, isNewConnector).map(
          (id) =>
            `${id}: was added to vendor_api_exemptions.json, which may only shrink for existing connectors; record its artifacts with ${SCRIPT} --connector ${id} instead`
        )
      ).toEqual([]);
    }
  );

  describe('recorded artifacts', () => {
    const recorded = fs
      .readdirSync(path.join(__dirname, 'specs'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .filter((entry) =>
        fs.existsSync(path.join(__dirname, 'specs', entry.name, 'vendor_api', 'manifest.json'))
      )
      .map(({ name }) => name);

    it.each(recorded)(
      '%s re-records offline without problems or changes',
      async (name) => {
        const found = connectors.find(
          ({ directory }) => directory === path.join(__dirname, 'specs', name, 'vendor_api')
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
