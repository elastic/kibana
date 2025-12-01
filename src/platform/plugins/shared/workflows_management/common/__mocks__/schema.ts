/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ConnectorTypeInfo } from '@kbn/workflows';
import { WorkflowSchema } from '@kbn/workflows/spec/schema';

// Re-export everything from the actual schema module
const actual = jest.requireActual<typeof import('../schema')>('../schema');

/**
 * Mock implementation of getWorkflowZodSchema that returns the actual WorkflowSchema
 * without requiring connector generation. This avoids the need to set up connectors
 * in tests while still providing proper schema validation.
 */
export const getWorkflowZodSchema = jest
  .fn()
  .mockImplementation((_dynamicConnectorTypes: Record<string, ConnectorTypeInfo>) => {
    return WorkflowSchema;
  });

/**
 * Mock implementation of getWorkflowZodSchemaLoose that returns the actual WorkflowSchema
 * without requiring connector generation.
 */
export const getWorkflowZodSchemaLoose = jest
  .fn()
  .mockImplementation((_dynamicConnectorTypes: Record<string, ConnectorTypeInfo>) => {
    return WorkflowSchema;
  });

/**
 * Mock implementation of getAllConnectors that returns an empty array
 * to avoid requiring stepSchemas initialization in tests.
 */
export const getAllConnectors = jest.fn().mockImplementation(() => {
  return [];
});

/**
 * Mock implementation of getAllConnectorsWithDynamic that returns an empty array
 * to avoid requiring stepSchemas initialization in tests.
 */
export const getAllConnectorsWithDynamic = jest
  .fn()
  .mockImplementation((_dynamicConnectorTypes?: Record<string, ConnectorTypeInfo>) => {
    return [];
  });

/**
 * Mock implementation of getOutputSchemaForStepType that returns appropriate schemas
 * for common step types to avoid requiring stepSchemas initialization in tests.
 */
export const getOutputSchemaForStepType = jest.fn().mockImplementation((stepType: string) => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { z } = require('@kbn/zod');

  // Return correct schema for console step (most common in tests)
  if (stepType === 'console') {
    return z.string();
  }

  // Handle internal actions with pattern matching
  if (stepType.startsWith('elasticsearch.')) {
    return z.any();
  }

  if (stepType.startsWith('kibana.')) {
    return z.any();
  }

  // Fallback to any if not found
  return z.any();
});

// Re-export all other exports from the actual module
export const {
  WORKFLOW_ZOD_SCHEMA,
  WORKFLOW_ZOD_SCHEMA_LOOSE,
  convertDynamicConnectorsToContracts,
  getCachedAllConnectorsMap,
  setCachedAllConnectorsMap,
  addDynamicConnectorsToCache,
  getCachedDynamicConnectorTypes,
} = actual;

export type { WorkflowZodSchemaType, WorkflowZodSchemaLooseType } from '../schema';
