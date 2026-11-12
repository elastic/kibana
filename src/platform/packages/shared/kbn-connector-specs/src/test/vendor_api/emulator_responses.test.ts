/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import path from 'path';
import { createEmulatorFetch } from '@kbn/connector-emulate';
import { readResponseFixtures } from './load_responses';
import { loadVendorSpecs, SILENT_LOG } from './load_vendor_specs';

const SPECS = path.resolve(__dirname, '../../specs');
const SCENARIO = path.join('emulator', 'responses.json');

const connectorsWithScenario = fs
  .readdirSync(SPECS)
  .filter((connector) => fs.existsSync(path.join(SPECS, connector, SCENARIO)));

describe('the emulator responses of connectors (emulator/responses.json)', () => {
  it('exist for the connectors the Scout suites run against the emulator', () => {
    expect(connectorsWithScenario).toStrictEqual(
      expect.arrayContaining(['brave_search', 'censys', 'figma', 'firecrawl', 'jina', 'shodan'])
    );
  });

  // A scenario the vendor's spec has outgrown (after a refresh of the snapshots) shows up here
  // rather than as a Scout failure.
  it.each(connectorsWithScenario)('%s: every response fits the vendor spec', async (connector) => {
    const { specs, pagination } = await loadVendorSpecs({
      directory: path.join(SPECS, connector, 'vendor_api'),
      fetchText: () => Promise.reject(new Error('The committed snapshots are enough')),
      log: SILENT_LOG,
    });
    const fixtures = await readResponseFixtures(path.join(SPECS, connector, SCENARIO));

    // Set the way the Scout suites set them: the emulator serves the fixtures it is started with as
    // written, but checks the ones set while it runs, which it drops all if one doesn't fit.
    const rejectedResponses = createEmulatorFetch({ specs, pagination }).runtimeFixtures.set(
      fixtures
    );

    expect(fixtures.length).toBeGreaterThan(0);
    expect(rejectedResponses).toStrictEqual([]);
  });
});
