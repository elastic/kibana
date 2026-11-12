/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ContractCall, EmulatorControl, ResponseFixture } from '@kbn/connector-emulate';
import { createEmulatorControl, resolveEmulatorLocation } from '@kbn/connector-emulate';
import { REPO_ROOT } from '@kbn/repo-info';
import type { ApiClientFixture, KbnClient, RoleApiCredentials } from '@kbn/scout';
import { expect } from '@kbn/scout/api';

/**
 * The control client of the connector emulator, scoped to one connector (its connector id without
 * the dot). It fails with what to do when the emulator isn't serving that connector, as Kibana
 * trusts the emulator's CA only if it exists when Kibana starts.
 */
export const connectToEmulator = async (connectorName: string): Promise<EmulatorControl> => {
  const { proxyUrl } = resolveEmulatorLocation({ repoRoot: REPO_ROOT });
  const control = createEmulatorControl(proxyUrl, { connector: connectorName });
  try {
    await control.reset();
  } catch (error) {
    throw new Error(
      `The connector emulator isn't answering at ${proxyUrl}: ${error}. Start it with ` +
        `"node scripts/connector_emulate --connector .${connectorName}", or with --all to serve every ` +
        'connector, before the Scout servers.'
    );
  }
  return control;
};

/** Creates a connector of the given type, which the emulator accepts any credential for. */
export const createConnector = async (
  kbnClient: KbnClient,
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
    path: '/api/actions/connector',
    body: { connector_type_id: connectorTypeId, name, config, secrets },
  });
  return data.id;
};

export const deleteConnector = async (kbnClient: KbnClient, connectorId: string) => {
  await kbnClient.request({ method: 'DELETE', path: `/api/actions/connector/${connectorId}` });
};

/** Runs one action of a connector through Kibana's actions API. */
export const executeAction = (
  apiClient: ApiClientFixture,
  credentials: RoleApiCredentials,
  connectorId: string,
  subAction: string,
  subActionParams: Record<string, unknown>
) =>
  apiClient.post(`/api/actions/connector/${connectorId}/_execute`, {
    headers: {
      ...credentials.apiKeyHeader,
      'kbn-xsrf': 'scout',
      'x-elastic-internal-origin': 'kibana',
    },
    body: { params: { subAction, subActionParams } },
  });

/** The calls the emulator logged for a request, such as `GET https://api.shodan.io/shodan/host/count`. */
export const callsTo = async (control: EmulatorControl, request: string): Promise<ContractCall[]> =>
  (await control.calls()).calls.filter((call) => call.request === request);

/**
 * The one request the emulator saw, which it found valid, and what it captured of it: the
 * credential must be redacted (so it never reaches the emulator's logs), and the query or body the
 * connector sent must contain what the action was asked for.
 */
export const expectVendorRequest = async (
  control: EmulatorControl,
  request: string,
  expected: {
    query?: Record<string, unknown>;
    body?: Record<string, unknown>;
    /** Lowercase header names, with the redacted values they should carry. */
    headers?: Record<string, string>;
  } = {}
) => {
  const calls = await callsTo(control, request);
  expect(calls).toHaveLength(1);
  const [call] = calls;
  expect(call).toMatchObject({ status: 200, requestViolations: [], responseViolations: [] });
  const { query, body, headers } = expected;
  if (query) {
    expect(call.captured?.request.query).toMatchObject(query);
  }
  if (body) {
    expect(call.captured?.request.body).toMatchObject(body);
  }
  if (headers) {
    expect(call.captured?.request.headers).toMatchObject(headers);
  }
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
