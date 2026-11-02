/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { createFlagError } from '@kbn/dev-cli-errors';
import { KIBANA_API_VERSION } from './constants';
import type { JsonObject, JsonValue } from './types';

export interface KibanaConnection {
  kibanaUrl: string;
  space?: string;
  apiKey?: string;
  username?: string;
  password?: string;
}

const REQUEST_TIMEOUT_MS = 60_000;

/** Auth-flag subset of a connection. */
export type AuthFlags = Pick<KibanaConnection, 'apiKey' | 'username' | 'password'>;

/**
 * Validate the mutually-exclusive auth flags, throwing a `FlagError` (so the CLI
 * prints usage) on misuse: `--api-key` cannot be combined with basic auth, and
 * `--username`/`--password` must be supplied together.
 */
export const validateAuthFlags = ({ apiKey, username, password }: AuthFlags): void => {
  if (apiKey && (username || password)) {
    throw createFlagError('Provide either --api-key or --username/--password, not both.');
  }
  if (!apiKey && Boolean(username) !== Boolean(password)) {
    throw createFlagError('Both --username and --password are required together.');
  }
};

export const buildAuthHeader = (connection: AuthFlags): string | undefined => {
  if (connection.apiKey) {
    return `ApiKey ${connection.apiKey}`;
  }
  if (connection.username != null && connection.password != null) {
    return `Basic ${Buffer.from(`${connection.username}:${connection.password}`).toString(
      'base64'
    )}`;
  }
  return undefined;
};

export const buildSpacePrefix = (space?: string): string =>
  space && space !== 'default' ? `/s/${space}` : '';

const kibanaGet = async (connection: KibanaConnection, path: string): Promise<JsonObject> => {
  const base = connection.kibanaUrl.replace(/\/$/, '');
  const url = `${base}${buildSpacePrefix(connection.space)}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'kbn-xsrf': 'true',
    'x-elastic-internal-origin': 'Kibana',
    'elastic-api-version': KIBANA_API_VERSION,
  };
  const authHeader = buildAuthHeader(connection);
  if (authHeader) {
    headers.Authorization = authHeader;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : '';
    if (name === 'AbortError' || name === 'TimeoutError') {
      throw new Error(
        `GET ${url} timed out after ${REQUEST_TIMEOUT_MS}ms - is Kibana reachable at ${connection.kibanaUrl}?`
      );
    }
    throw error;
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`GET ${url} failed: ${response.status} ${response.statusText} ${text}`.trim());
  }

  return (await response.json()) as JsonObject;
};

export interface KibanaBuildInfo {
  version: string;
  buildHash: string;
}

/** Read the version/build hash from `GET /api/status`. */
export const fetchBuildInfo = async (
  connection: KibanaConnection,
  log: ToolingLog
): Promise<KibanaBuildInfo> => {
  log.debug('Fetching Kibana build info from /api/status');
  const status = await kibanaGet(connection, '/api/status');
  const version = status.version;
  if (version === null || typeof version !== 'object' || Array.isArray(version)) {
    throw new Error('Unexpected /api/status response: missing version object');
  }
  const number = typeof version.number === 'string' ? version.number : 'unknown';
  const buildHash = typeof version.build_hash === 'string' ? version.build_hash : 'unknown';
  return { version: number, buildHash };
};

/** Fetch the composed workflow document schema (`loose=false`). */
export const fetchComposedSchema = async (
  connection: KibanaConnection,
  log: ToolingLog
): Promise<JsonObject> => {
  log.info('Fetching composed workflow schema (GET /api/workflows/schema?loose=false)');
  return kibanaGet(connection, '/api/workflows/schema?loose=false');
};

/** Fetch and sort the available connector type ids. */
export const fetchConnectorTypes = async (
  connection: KibanaConnection,
  log: ToolingLog
): Promise<string[]> => {
  log.info('Fetching connectors (GET /api/workflows/connectors)');
  const body = await kibanaGet(connection, '/api/workflows/connectors');
  const connectorTypes = body.connectorTypes;
  if (
    connectorTypes !== null &&
    typeof connectorTypes === 'object' &&
    !Array.isArray(connectorTypes)
  ) {
    return Object.keys(connectorTypes).sort();
  }
  return [];
};

/** Extract sorted `id` strings from a `[{ id, ... }]` definition-endpoint payload. */
const extractDefinitionIds = (entries: JsonValue | undefined): string[] => {
  if (!Array.isArray(entries)) {
    return [];
  }
  const ids = entries
    .map((entry) =>
      entry !== null &&
      typeof entry === 'object' &&
      !Array.isArray(entry) &&
      typeof entry.id === 'string'
        ? entry.id
        : undefined
    )
    .filter((id): id is string => id !== undefined);
  return [...new Set(ids)].sort();
};

/**
 * Fetch the ids of registered step definitions from the internal
 * `workflows_extensions` route. Used by the completeness gate to verify the
 * produced schema didn't drop a registered step.
 */
export const fetchStepDefinitionIds = async (
  connection: KibanaConnection,
  log: ToolingLog
): Promise<string[]> => {
  log.info(
    'Fetching registered step definitions (GET /internal/workflows_extensions/step_definitions)'
  );
  const body = await kibanaGet(connection, '/internal/workflows_extensions/step_definitions');
  return extractDefinitionIds(body.steps);
};

/** Fetch the ids of registered trigger definitions from the internal route. */
export const fetchTriggerDefinitionIds = async (
  connection: KibanaConnection,
  log: ToolingLog
): Promise<string[]> => {
  log.info(
    'Fetching registered trigger definitions (GET /internal/workflows_extensions/trigger_definitions)'
  );
  const body = await kibanaGet(connection, '/internal/workflows_extensions/trigger_definitions');
  return extractDefinitionIds(body.triggers);
};
