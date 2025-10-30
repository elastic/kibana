/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsQueryParams, KibanaApiParams, EsArchiverParams, ToolResult } from '../types';
import { success, error } from '../utils';

/**
 * Execute Elasticsearch query
 *
 * Note: This requires an authenticated Elasticsearch client from Scout fixtures.
 * For MCP server usage, we need proper fixture initialization.
 */
export async function scoutEsQuery(params: EsQueryParams): Promise<ToolResult> {
  return error(
    'Elasticsearch queries not yet implemented in MCP server. ' +
    'ES queries require Scout fixture initialization with authenticated ES client.'
  );
}

/**
 * Call Kibana API
 *
 * Note: This requires an authenticated Kibana client from Scout fixtures.
 * For MCP server usage, we need proper fixture initialization.
 */
export async function scoutKibanaApi(params: KibanaApiParams): Promise<ToolResult> {
  return error(
    'Kibana API calls not yet implemented in MCP server. ' +
    'Kibana API requires Scout fixture initialization with authenticated Kibana client.'
  );
}

/**
 * Load or unload test data using ES Archiver
 *
 * Note: This requires ES Archiver fixture from Scout.
 * For MCP server usage, we need proper fixture initialization.
 */
export async function scoutEsArchiver(params: EsArchiverParams): Promise<ToolResult> {
  return error(
    'ES Archiver not yet implemented in MCP server. ' +
    'ES Archiver requires Scout fixture initialization.'
  );
}

/**
 * Get Scout test configuration
 */
export async function scoutGetConfig(configKey?: string): Promise<ToolResult> {
  return error(
    'Config access not yet implemented in MCP server. ' +
    'Config requires Scout fixture initialization.'
  );
}

/**
 * List available fixture operations
 */
export async function scoutListFixtures(): Promise<ToolResult> {
  return success({
    fixtures: {
      esQuery: {
        description: 'Execute Elasticsearch queries',
        params: 'index: string, body: object',
        note: 'Not yet implemented - requires authenticated ES client',
      },
      kibanaApi: {
        description: 'Call Kibana APIs',
        params: 'method: string, path: string, body?: object',
        note: 'Not yet implemented - requires authenticated Kibana client',
      },
      esArchiver: {
        description: 'Load/unload test data',
        params: 'action: "load" | "unload", archiveName: string',
        note: 'Not yet implemented - requires ES Archiver fixture',
      },
      config: {
        description: 'Access Scout test configuration',
        params: 'configKey?: string',
        note: 'Not yet implemented - requires Scout config',
      },
    },
    warning: 'Fixture operations require full Scout test context initialization',
  });
}
