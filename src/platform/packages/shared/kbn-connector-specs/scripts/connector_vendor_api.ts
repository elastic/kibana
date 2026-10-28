/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { existsSync } from 'fs';
import path from 'path';
import { run } from '@kbn/dev-cli-runner';
import { createFailError, createFlagError } from '@kbn/dev-cli-errors';
import { REPO_ROOT } from '@kbn/repo-info';
import { findConnector } from '../src/test/vendor_api/find_connector';
import { inspectVendorApi } from '../src/test/vendor_api/inspect_vendor_api';
import { createSpecCache } from '../src/test/vendor_api/spec_cache';
import { updateVendorApi } from '../src/test/vendor_api/update_vendor_api';

const SPEC_CACHE = path.join(REPO_ROOT, 'data', 'connector_vendor_api');

const parseSource = (flag: string): [string, string] => {
  const separator = flag.indexOf('=');
  if (separator < 1) {
    throw createFlagError(`--source must look like name=url, got "${flag}"`);
  }
  return [flag.slice(0, separator), flag.slice(separator + 1)];
};

const fetchText = async (url: string): Promise<string> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.text();
};

run(
  async ({ log, flagsReader }) => {
    const check = flagsReader.boolean('check');
    const refresh = flagsReader.boolean('refresh');
    const sources = Object.fromEntries(
      (flagsReader.arrayOfStrings('source') ?? []).map(parseSource)
    );
    const now = () => new Date();
    const cache = createSpecCache({ directory: SPEC_CACHE, fetchText, refresh, now, log });

    if (flagsReader.boolean('inspect')) {
      if (check) {
        throw createFlagError('--inspect checks nothing; leave out --check');
      }
      const inspectedId = flagsReader.string('connector');
      const directory = inspectedId ? (await findConnector(inspectedId)).directory : undefined;
      const { output, manifestUpdated, problems } = await inspectVendorApi({
        sources,
        directory,
        operations: flagsReader.arrayOfStrings('operation') ?? [],
        grep: flagsReader.string('grep'),
        depth: flagsReader.number('depth'),
        fetchText: cache.fetchText,
        fetchedAt: cache.fetchedAt,
        now,
        log,
      });
      log.write(output);
      if (directory && manifestUpdated) {
        log.info(
          `Added the sources to ${path.relative(REPO_ROOT, path.join(directory, 'manifest.json'))}`
        );
      }
      if (problems.length > 0) {
        throw createFailError(problems.join('\n'));
      }
      return;
    }

    const id = flagsReader.requiredString('connector');
    const { connector, directory } = await findConnector(id);
    if (Object.keys(sources).length === 0 && !existsSync(path.join(directory, 'manifest.json'))) {
      throw createFlagError(
        `${id} has no vendor_api/manifest.json yet; pass its specs with --source`
      );
    }
    const { changed, problems } = await updateVendorApi({
      connector,
      directory,
      sources,
      refresh,
      check,
      fetchText: cache.fetchText,
      fetchedAt: cache.fetchedAt,
      now,
      log,
    });

    for (const file of changed) {
      const relative = path.relative(REPO_ROOT, path.join(directory, file));
      log.info(`${check ? 'Out of date' : 'Updated'}: ${relative}`);
    }
    if (problems.length > 0) {
      throw createFailError(
        `${problems.length} problem(s) recording ${id}:\n${problems
          .map((p) => `  - ${p}`)
          .join('\n')}`
      );
    }
    if (check && changed.length > 0) {
      throw createFailError(
        `Vendor API artifacts of ${id} are out of date; run node scripts/connector_vendor_api --connector ${id}`
      );
    }
    if (changed.length === 0) {
      log.success(`Vendor API artifacts of ${id} are up to date`);
    }
  },
  {
    description: `Records which vendor API operations a connector calls and writes its vendor_api artifacts.

      Without --source or --refresh, records offline against the committed snapshots.
      With --inspect, shows what the vendor specs offer instead, before or while writing the connector.

      Fetched specs are kept in data/connector_vendor_api, so a spec inspected before writing a
      connector is the one it is recorded against. --refresh fetches them again.`,
    flags: {
      string: ['connector', 'source', 'operation', 'grep', 'depth'],
      boolean: ['refresh', 'check', 'inspect'],
      help: `
        --connector  Connector metadata.id, for example datadog or .datadog (required unless --inspect)
        --source     name=url of a vendor spec to add or move; repeatable. Loads every source.
        --refresh    Fetch every source URL again, instead of using the specs fetched before
        --check      Write nothing; fail if artifacts would change or problems are found
        --inspect    List the operations of the --source specs, or of the connector's manifest
                     sources, with its overlay applied. With --connector, adds new --source specs
                     to its manifest.json, so recording needs no --source
        --operation  With --inspect, describe this operation instead: "METHOD /path" or an
                     operationId; repeatable
        --grep       With --inspect, list only operations matching this case-insensitive pattern
        --depth      With --inspect, how many $refs deep to inline schemas (default 4)
      `,
    },
  }
);
