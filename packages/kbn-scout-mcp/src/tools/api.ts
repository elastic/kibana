/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ApiServiceParams, ToolResult } from '../types';
import { success, error } from '../utils';

/**
 * Use Scout API services
 *
 * Note: This is a placeholder implementation. In a real Scout environment,
 * API services would be available through fixtures and would provide
 * authenticated clients for interacting with Kibana APIs.
 *
 * For MCP server usage, we need to:
 * 1. Initialize Scout fixtures properly
 * 2. Get API service instances from worker fixtures
 * 3. Use authenticated clients
 */
export async function scoutApiService(params: ApiServiceParams): Promise<ToolResult> {
  return error(
    'API services not yet implemented in MCP server. ' +
      'API services require Scout fixture initialization which needs a full test context.'
  );
}

/**
 * List available API services
 */
export async function scoutListApiServices(): Promise<ToolResult> {
  return success({
    services: {
      alerting: {
        description: 'Alerting Rules API service',
        methods: [
          'createRule(params) - Create an alerting rule',
          'getRules() - Get all rules',
          'getRule(id) - Get a specific rule',
          'updateRule(id, params) - Update a rule',
          'deleteRule(id) - Delete a rule',
          'enableRule(id) - Enable a rule',
          'disableRule(id) - Disable a rule',
        ],
        note: 'Requires authenticated Kibana client',
      },
      cases: {
        description: 'Cases API service',
        methods: [
          'createCase(params) - Create a case',
          'getCases() - Get all cases',
          'getCase(id) - Get a specific case',
          'updateCase(id, params) - Update a case',
          'deleteCase(id) - Delete a case',
          'addComment(caseId, comment) - Add comment to case',
        ],
        note: 'Requires authenticated Kibana client',
      },
      fleet: {
        description: 'Fleet API service',
        methods: [
          'setup() - Setup Fleet',
          'createAgentPolicy(params) - Create agent policy',
          'getAgentPolicies() - Get all agent policies',
          'installPackage(name, version) - Install integration package',
          'createPackagePolicy(params) - Create package policy',
        ],
        note: 'Requires authenticated Kibana client',
      },
      streams: {
        description: 'Streams API service',
        methods: [
          'createStream(params) - Create a stream',
          'getStreams() - Get all streams',
          'deleteStream(id) - Delete a stream',
        ],
        note: 'Requires authenticated Kibana client',
      },
    },
    warning: 'API services are not yet fully implemented in MCP server',
  });
}
