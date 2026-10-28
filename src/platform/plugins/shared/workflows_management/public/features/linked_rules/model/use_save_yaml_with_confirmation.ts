/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback } from 'react';
import { useStore } from 'react-redux-v7';
import type { ConfirmDisableWorkflows } from './use_disable_workflows_confirmation';
import { useSaveYaml } from '../../../entities/workflows/model/use_save_yaml';
import type { RootState } from '../../../entities/workflows/store/types';
import {
  selectWorkflow,
  selectWorkflowDefinition,
} from '../../../entities/workflows/store/workflow_detail/selectors';

/** Saves the YAML after confirming any disable; resolves to false when the user cancels. */
export const useSaveYamlWithConfirmation = (
  confirmDisable: ConfirmDisableWorkflows
): (() => Promise<boolean>) => {
  const saveYaml = useSaveYaml();
  const store = useStore<RootState>();

  return useCallback(async () => {
    const state = store.getState();
    const workflow = selectWorkflow(state);
    if (
      workflow?.enabled &&
      selectWorkflowDefinition(state)?.enabled === false &&
      !(await confirmDisable([workflow.id]))
    ) {
      return false;
    }
    await saveYaml();
    return true;
  }, [confirmDisable, saveYaml, store]);
};
