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
import { checkEmulatorResponses, EMULATOR_RESPONSES } from './check_emulator_responses';

const SPECS = path.resolve(__dirname, '../../specs');

const connectorsWithResponses = fs
  .readdirSync(SPECS)
  .filter((connector) =>
    fs.existsSync(path.join(SPECS, connector, 'vendor_api', EMULATOR_RESPONSES))
  );

describe('the emulator responses of connectors (vendor_api/emulator_responses.json)', () => {
  it('exist for the connectors the Scout suites run against the emulator', () => {
    expect(connectorsWithResponses).toStrictEqual(
      expect.arrayContaining([
        'brave_search',
        'censys',
        'figma',
        'firecrawl',
        'grafana',
        'jina',
        'sentry',
        'shodan',
        'sublime_security',
      ])
    );
  });

  // The weekly drift check does the same against the vendors' latest specs. This one is for the
  // committed ones, so a response written or a spec refreshed here is caught before it is merged.
  it.each(connectorsWithResponses)('%s: every response fits the vendor spec', async (connector) => {
    expect(await checkEmulatorResponses(path.join(SPECS, connector, 'vendor_api'))).toStrictEqual(
      []
    );
  });
});
