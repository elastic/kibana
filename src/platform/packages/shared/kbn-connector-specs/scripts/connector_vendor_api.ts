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
import { updateVendorApi } from '../src/test/vendor_api/update_vendor_api';

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
    const id = flagsReader.requiredString('connector');
    const check = flagsReader.boolean('check');
    const sources = Object.fromEntries(
      (flagsReader.arrayOfStrings('source') ?? []).map(parseSource)
    );

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
      refresh: flagsReader.boolean('refresh'),
      check,
      fetchText,
      now: () => new Date(),
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

      Without --source or --refresh, records offline against the committed snapshots.`,
    flags: {
      string: ['connector', 'source'],
      boolean: ['refresh', 'check'],
      help: `
        --connector  Connector metadata.id, for example datadog or .datadog (required)
        --source     name=url of a vendor spec to add or move; repeatable. Fetches every source.
        --refresh    Fetch every source URL in manifest.json again
        --check      Write nothing; fail if artifacts would change or problems are found
      `,
    },
  }
);
