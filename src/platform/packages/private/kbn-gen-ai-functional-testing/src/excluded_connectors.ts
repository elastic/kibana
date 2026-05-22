/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AvailableConnector } from './connectors';

/**
 * Preconfigured connector IDs omitted from FTR / Scout LLM suites.
 * These may appear in CI connector payloads but lack working credentials in the test environment.
 */
export const FTR_EXCLUDED_CONNECTOR_IDS = new Set<string>(['bedrock-claude-sonnet-3-7']);

export const omitFtrExcludedConnectorsFromRecord = (
  connectors: Record<string, AvailableConnector>
): Record<string, AvailableConnector> =>
  Object.fromEntries(
    Object.entries(connectors).filter(([id]) => !FTR_EXCLUDED_CONNECTOR_IDS.has(id))
  );

export const omitFtrExcludedConnectors = <T extends { id: string }>(
  connectors: readonly T[]
): T[] => connectors.filter((connector) => !FTR_EXCLUDED_CONNECTOR_IDS.has(connector.id));
