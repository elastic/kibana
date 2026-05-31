/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useWorkflowExecuteHitTableConfigImpl } from './use_workflow_execute_hit_table_config_impl';
import type {
  UseWorkflowExecuteHitTableConfigOptions,
  UseWorkflowExecuteHitTableConfigResult,
} from './use_workflow_execute_hit_table_config_types';

export type {
  UseWorkflowExecuteHitTableConfigOptions,
  UseWorkflowExecuteHitTableConfigResult,
} from './use_workflow_execute_hit_table_config_types';

export type UseWorkflowExecuteHitTableConfigFn = (
  options: UseWorkflowExecuteHitTableConfigOptions
) => UseWorkflowExecuteHitTableConfigResult;

export const useWorkflowExecuteHitTableConfig =
  useWorkflowExecuteHitTableConfigImpl as UseWorkflowExecuteHitTableConfigFn;
