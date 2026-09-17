/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorContractUnion, ConnectorTypeInfo } from '@kbn/workflows';
import { getAllConnectors, getAllConnectorsWithDynamic } from '../../../../common/schema';

/**
 * Reads the preloaded connector catalog. Spec-based action schemas come from
 * the bulk catalog applied at plugin start / editor mount — never from
 * `@kbn/connector-specs` in the browser.
 */
export function getCachedAllConnectors(
  dynamicConnectorTypes?: Record<string, ConnectorTypeInfo>
): ConnectorContractUnion[] {
  if (dynamicConnectorTypes) {
    // Use the same function that generates the schema to ensure consistency
    return getAllConnectorsWithDynamic(dynamicConnectorTypes);
  }
  return getAllConnectors();
}
