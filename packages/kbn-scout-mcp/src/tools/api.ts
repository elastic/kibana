/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ToolResult } from '../types';
import { success } from '../utils';

/**
 * List available API services (reference guide)
 *
 * Note: API tools (ES query, Kibana API) are not yet registered in the MCP server.
 * They require Scout fixture initialization which is not yet implemented for MCP usage.
 */
export async function scoutListApiServices(): Promise<ToolResult> {
  return success({
    services: {
      elasticsearch: {
        description: 'Elasticsearch client tools',
        note: 'Not yet available in MCP server - requires Scout fixture initialization',
      },
      kibana: {
        description: 'Kibana API client tools',
        note: 'Not yet available in MCP server - requires Scout fixture initialization',
      },
    },
    message: 'API tools are not yet available. Use browser automation tools for UI testing.',
  });
}
