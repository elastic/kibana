/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EmulatorControl } from '@kbn/connector-emulate';
import { createEmulatorControl, resolveEmulatorLocation } from '@kbn/connector-emulate';
import { REPO_ROOT } from '@kbn/repo-info';

/** What the emulator calls `.firecrawl`: its connector id without the dot. */
export const EMULATOR_NAME = 'firecrawl';
export const VENDOR = 'https://api.firecrawl.dev/v2';
export const CRAWL_ID = '0b8e1c52-6a1f-4c3e-9d7a-2f4b5c6d7e8f';

export const crawlStatus = (status: string) => ({
  status,
  total: 0,
  completed: 0,
  creditsUsed: 0,
  data: [],
});

/**
 * The control client of the connector emulator, scoped to Firecrawl. It fails with what to do when
 * the emulator isn't running, as Kibana trusts the emulator's CA only if it exists when Kibana
 * starts.
 */
export const connectToEmulator = async (): Promise<EmulatorControl> => {
  const { proxyUrl } = resolveEmulatorLocation({ repoRoot: REPO_ROOT });
  const control = createEmulatorControl(proxyUrl, { connector: EMULATOR_NAME });
  try {
    await control.reset();
  } catch (error) {
    throw new Error(
      `The connector emulator isn't answering at ${proxyUrl}: ${error}. Start it with ` +
        '"node scripts/connector_emulate --connector firecrawl" before the Scout servers.'
    );
  }
  return control;
};
