/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EmulatorControl, ResponseFixture } from '@kbn/connector-emulate';
import { createEmulatorControl, resolveEmulatorLocation } from '@kbn/connector-emulate';
import { REPO_ROOT } from '@kbn/repo-info';
import type { KbnClient } from '@kbn/scout';

export {
  FIRECRAWL_CRAWL_ID as CRAWL_ID,
  FIRECRAWL_VENDOR_URL as VENDOR,
  getFirecrawlFixtures,
} from '@kbn/connector-specs/src/specs/firecrawl/vendor_api/emulator_responses';

/** What the emulator calls `.firecrawl`: its connector id without the dot. */
export const EMULATOR_NAME = 'firecrawl';

/**
 * The control client of the connector emulator, scoped to a connector (its connector id without
 * the dot). It fails with what to do when the emulator isn't serving it, as Kibana trusts the
 * emulator's CA only if it exists when Kibana starts.
 */
export const connectToEmulator = async (
  connectorName: string = EMULATOR_NAME
): Promise<EmulatorControl> => {
  const { proxyUrl } = resolveEmulatorLocation({ repoRoot: REPO_ROOT });
  const control = createEmulatorControl(proxyUrl, { connector: connectorName });
  try {
    await control.reset();
  } catch (error) {
    throw new Error(
      `The connector emulator isn't answering at ${proxyUrl}: ${error}. Start it with ` +
        `"node scripts/connector_emulate --connector .${connectorName}" (add the other connectors ` +
        'these suites test, separated by commas) before the Scout servers.'
    );
  }
  return control;
};

/** Creates a connector in a space, which the emulator accepts any credential for. */
export const createConnectorInSpace = async (
  kbnClient: KbnClient,
  spaceId: string,
  connector: {
    connectorTypeId: string;
    name: string;
    config?: Record<string, unknown>;
    secrets: Record<string, unknown>;
  }
): Promise<string> => {
  const { connectorTypeId, name, config = {}, secrets } = connector;
  const { data } = await kbnClient.request<{ id: string }>({
    method: 'POST',
    path: `/s/${spaceId}/api/actions/connector`,
    body: { connector_type_id: connectorTypeId, name, config, secrets },
  });
  return data.id;
};

export const deleteConnectorInSpace = async (
  kbnClient: KbnClient,
  spaceId: string,
  connectorId: string
) => {
  await kbnClient.request({
    method: 'DELETE',
    path: `/s/${spaceId}/api/actions/connector/${connectorId}`,
  });
};

/** Sets runtime fixtures, failing when the vendor's spec rejects any, as the emulator then sets none. */
export const setFixtures = async (
  control: EmulatorControl,
  fixtures: readonly ResponseFixture[]
): Promise<void> => {
  const rejected = await control.setFixtures(fixtures);
  if (rejected.length > 0) {
    throw new Error(`The emulator rejected the fixtures: ${JSON.stringify(rejected, null, 2)}`);
  }
};
