/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';

export const CONNECTOR_ID = '.mcp';
export const CONNECTOR_NAME = i18n.translate('connectors.mcp.title', {
  defaultMessage: 'MCP',
});

/**
 * MCP client version used by the connector.
 */
export const MCP_CLIENT_VERSION = '1.0.0';

export const MAX_RETRIES = 2; // Three total attempts (1 initial + 2 retries)

/**
 * Sub-actions supported by the MCP connector.
 * Values must match the registered sub-action names in the backend.
 */
export enum SUB_ACTION {
  /** Initialize/test the connection to the MCP server */
  INITIALIZE = 'test',
  /** List available tools from the MCP server */
  LIST_TOOLS = 'listTools',
  /** Call a specific tool on the MCP server */
  CALL_TOOL = 'callTool',
}
