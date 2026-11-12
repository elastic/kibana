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
import { parseDocument } from 'yaml';
import type { ConfirmDisableWorkflows } from './use_disable_workflows_confirmation';
import { useSaveYaml } from '../../../entities/workflows/model/use_save_yaml';
import type { RootState } from '../../../entities/workflows/store/types';
import {
  selectWorkflow,
  selectYamlString,
} from '../../../entities/workflows/store/workflow_detail/selectors';
import { useConfirmBreakingChange } from '../../workflow_dependents/model/workflow_dependents_context';

/**
 * Saves the YAML after confirming a disable, or else any change that breaks workflows calling this
 * one; resolves to false when the user cancels.
 */
export const useSaveYamlWithConfirmation = (
  confirmDisable: ConfirmDisableWorkflows
): (() => Promise<boolean>) => {
  const saveYaml = useSaveYaml();
  const store = useStore<RootState>();
  const confirmBreakingChange = useConfirmBreakingChange();

  return useCallback(async () => {
    // The draft can change while a check is pending, so check again until the checked draft is
    // the one being saved.
    let yamlString: string | undefined;
    do {
      yamlString = selectYamlString(store.getState());
      const workflow = selectWorkflow(store.getState());
      const disables =
        workflow?.enabled && yamlString && parseDocument(yamlString).get('enabled') === false;
      // Disabling stops every caller, and the disable dialog already lists them.
      const confirmed = disables
        ? await confirmDisable([workflow.id])
        : !confirmBreakingChange || (await confirmBreakingChange(yamlString));
      if (!confirmed) {
        return false;
      }
    } while (selectYamlString(store.getState()) !== yamlString);
    await saveYaml();
    return true;
  }, [confirmBreakingChange, confirmDisable, saveYaml, store]);
};
