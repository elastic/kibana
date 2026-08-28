/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IDataStreamClient } from '@kbn/data-streams';
import type { GetFieldsOf, MappingsDefinition } from '@kbn/es-mappings';
import { mappings } from '@kbn/es-mappings';
import {
  WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
  WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS,
} from '../../mappings';
import { STEP_USAGE_MAPPING } from '../../mappings/common';

// The shared STEP_USAGE_MAPPING in common.ts uses `type: 'nested'`, which is not in
// @kbn/es-mappings's SupportedMappingPropertyType and therefore cannot satisfy the
// MappingsDefinition constraint required by GetFieldsOf / IDataStreamClient. Nested
// semantics are unnecessary here — stepUsage is only written and read from _source,
// never queried with nested path syntax — so object is equivalent for our purposes.
const DATASTREAM_STEP_USAGE_MAPPING = mappings.object({
  properties: STEP_USAGE_MAPPING.properties,
});

// Shadow the shared mapping constants to replace the nested-typed stepUsage field with
// the object-typed override above, making the full mapping satisfy MappingsDefinition.
export const DATASTREAM_WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS = {
  ...WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS,
  properties: {
    ...WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS.properties,
    '@timestamp': mappings.date(),
    stepUsage: DATASTREAM_STEP_USAGE_MAPPING,
  },
} satisfies MappingsDefinition;

export const DATASTREAM_WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS = {
  ...WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
  properties: {
    '@timestamp': mappings.date(),
    ...WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS.properties,
    stepUsage: DATASTREAM_STEP_USAGE_MAPPING,
  },
} satisfies MappingsDefinition;

export type EsWorkflowStepExecutionEntry = GetFieldsOf<
  typeof DATASTREAM_WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS
>;

export type StepExecutionsDataStreamClient = IDataStreamClient<
  typeof DATASTREAM_WORKFLOWS_STEP_EXECUTIONS_INDEX_MAPPINGS,
  EsWorkflowStepExecutionEntry
>;

export type EsWorkflowExecutionEntry = GetFieldsOf<
  typeof DATASTREAM_WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS
>;

export type WorkflowExecutionsDataStreamClient = IDataStreamClient<
  typeof DATASTREAM_WORKFLOWS_EXECUTIONS_INDEX_MAPPINGS,
  EsWorkflowExecutionEntry
>;
