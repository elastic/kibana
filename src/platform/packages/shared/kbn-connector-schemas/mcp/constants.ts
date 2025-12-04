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
 * Default inactivity timeout for MCP connections.
 * Connections will be automatically disconnected after this period of inactivity.
 */
export const DEFAULT_INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

/**
 * MCP client version used by the connector.
 */
export const MCP_CLIENT_VERSION = '1.0.0';

export const MAX_RETRIES = 3; // Three total retries (1 initial attempt + 2 retries)
