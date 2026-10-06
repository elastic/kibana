/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';
import type { ConnectorContractUnion } from '../../types/v1';
import { type CustomTriggerSchemaInput } from '../schema/triggers';
export declare function getStepId(stepName: string): string;
export declare function generateYamlSchemaFromConnectors(
  connectors: ConnectorContractUnion[],
  /** Registered custom triggers for YAML schema validation (id, optional requiresConnectorId) */
  triggers?: CustomTriggerSchemaInput[],
  /**
   * @deprecated use WorkflowSchemaForAutocomplete instead
   */
  loose?: boolean
): z.ZodType;
/**
 * Generates a schema for trusted workflow definitions that need the shared workflow envelope
 * validation without materializing the connector-expanded step union.
 */
export declare function generateLightweightYamlSchema(
  triggers?: CustomTriggerSchemaInput[]
): z.ZodType;
