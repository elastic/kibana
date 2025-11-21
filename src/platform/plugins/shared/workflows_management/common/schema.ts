/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorTypeInfo } from '@kbn/workflows';
import { generateYamlSchemaFromConnectors } from '@kbn/workflows';
import { z } from '@kbn/zod';
import {
  getAllConnectorsForDynamicTypes,
  getConnectorsCache,
  StaticConnectors,
} from './connectors_contracts/cache';

export const getOutputSchemaForStepType = (stepType: string) => {
  const connector = getConnectorsCache().map.get(stepType);
  if (connector) {
    return connector.outputSchema;
  }

  // Handle internal actions with pattern matching
  // TODO: add output schema support for elasticsearch.request and kibana.request connectors
  if (stepType.startsWith('elasticsearch.')) {
    return z.any();
  }

  if (stepType.startsWith('kibana.')) {
    return z.any();
  }

  // Fallback to any if not found
  return z.any();
};

// Dynamic schemas that include all connectors (static + Elasticsearch + dynamic)
// These use lazy loading to keep large generated files out of the main bundle
export const getWorkflowZodSchema = (dynamicConnectorTypes: Record<string, ConnectorTypeInfo>) => {
  const allConnectors = getAllConnectorsForDynamicTypes(dynamicConnectorTypes);
  return generateYamlSchemaFromConnectors(allConnectors.list);
};
export type WorkflowZodSchemaType = z.infer<ReturnType<typeof getWorkflowZodSchema>>;

export const getWorkflowZodSchemaLoose = (
  dynamicConnectorTypes: Record<string, ConnectorTypeInfo>
) => {
  const allConnectors = getAllConnectorsForDynamicTypes(dynamicConnectorTypes);
  return generateYamlSchemaFromConnectors(allConnectors.list, true);
};
export type WorkflowZodSchemaLooseType = z.infer<ReturnType<typeof getWorkflowZodSchemaLoose>>;

// Legacy exports for backward compatibility - these will be deprecated
// TODO: Remove these once all consumers are updated to use the lazy-loaded versions
export const WORKFLOW_ZOD_SCHEMA = generateYamlSchemaFromConnectors(StaticConnectors);
export const WORKFLOW_ZOD_SCHEMA_LOOSE = generateYamlSchemaFromConnectors(StaticConnectors, true);

// Partially recreated from x-pack/platform/plugins/shared/alerting/server/connector_adapters/types.ts
// TODO: replace with dynamic schema
