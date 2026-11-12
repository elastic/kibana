/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import path from 'path';
import type { EmulatorControl, ResponseFixture } from '@kbn/connector-emulate';
import { createEmulatorControl, resolveEmulatorLocation } from '@kbn/connector-emulate';
import { readResponseFixtures } from '@kbn/connector-specs/src/test/vendor_api/load_responses';
import { REPO_ROOT } from '@kbn/repo-info';
import type { KbnClient } from '@kbn/scout';

/** A connector's folder in `src/specs`, by the name of the folder. */
export const connectorFolder = (connector: string): string =>
  path.join(REPO_ROOT, 'src/platform/packages/shared/kbn-connector-specs/src/specs', connector);

/**
 * What the emulator answers a connector with in these suites, in place of values sampled from its
 * spec: the connector's `emulator/responses.json`, which `node scripts/connector_emulate --fixtures
 * <connector>=<that file>` serves too. `connector` is the name of its folder in `src/specs`.
 */
export const loadScenario = async (connector: string): Promise<ResponseFixture[]> =>
  readResponseFixtures(path.join(connectorFolder(connector), 'emulator/responses.json'));

/**
 * The control client of the connector emulator, scoped to a connector (its connector id without
 * the dot). It fails with what to do when the emulator isn't serving it, as Kibana trusts the
 * emulator's CA only if it exists when Kibana starts.
 */
export const connectToEmulator = async (connectorName: string): Promise<EmulatorControl> => {
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

/**
 * Authorizes an OAuth connector the way its user's browser would, minus the vendor's consent page:
 * starts the flow, then calls Kibana's callback with a code, which the emulator accepts and Kibana
 * trades for tokens at the vendor. Starting the flow and the callback are routes of a signed-in
 * user, so they take that user's session cookie.
 */
export const authorizeConnector = async ({
  kibanaUrl,
  spaceId,
  connectorId,
  cookieHeader,
}: {
  kibanaUrl: string;
  spaceId: string;
  connectorId: string;
  cookieHeader: Record<string, string>;
}): Promise<void> => {
  const headers = {
    ...cookieHeader,
    'kbn-xsrf': 'scout',
    'x-elastic-internal-origin': 'kibana',
    'content-type': 'application/json',
  };
  const space = `${kibanaUrl}/s/${spaceId}`;

  const start = await fetch(
    `${space}/internal/actions/connector/${connectorId}/_start_oauth_flow`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ returnUrl: `${kibanaUrl}/app/connectors` }),
    }
  );
  if (!start.ok) {
    throw new Error(`Starting the OAuth flow failed with ${start.status}: ${await start.text()}`);
  }
  const { state } = (await start.json()) as { state: string };

  const callback = await fetch(
    `${space}/api/actions/connector/_oauth_callback?code=a-code-the-emulator-accepts&state=${state}`,
    { headers, redirect: 'manual' }
  );
  const location = callback.headers.get('location') ?? '';
  if (callback.status !== 302 || !location.includes('oauth_authorization=success')) {
    throw new Error(`The OAuth callback answered ${callback.status} ${location}`);
  }
};
