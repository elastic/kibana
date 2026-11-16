/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useCallback, useEffect, useRef } from 'react';
import { useStore } from 'react-redux-v7';
import type { Store } from 'redux-v4';
import { parseDocument } from 'yaml';
import type { ConfirmDisableWorkflows } from './use_disable_workflows_confirmation';
import { useSaveYaml } from '../../../entities/workflows/model/use_save_yaml';
import type { RootState } from '../../../entities/workflows/store/types';
import {
  selectWorkflow,
  selectWorkflowId,
  selectYamlString,
} from '../../../entities/workflows/store/workflow_detail/selectors';
import { getActiveProposalContent } from '../../ai_integration';
import { useConfirmBreakingChange } from '../../workflow_dependents/model/workflow_dependents_context';

// Stores with a save being checked or sent. The header and the editor each save through their own
// hook, and the checks run before the save marks itself in progress.
const savingStores = new WeakSet<Store>();

// What saving persists: the draft with any pending AI proposals accepted.
const getDraftToSave = (state: RootState): string =>
  getActiveProposalContent() ?? selectYamlString(state);

/**
 * Saves the YAML after confirming a disable, or else any change that breaks workflows calling this
 * one; resolves to false when the user cancels, or opens another workflow or leaves the editor
 * before it saves.
 */
export const useSaveYamlWithConfirmation = (
  confirmDisable: ConfirmDisableWorkflows
): (() => Promise<boolean>) => {
  const saveYaml = useSaveYaml();
  const store = useStore<RootState>();
  const confirmBreakingChange = useConfirmBreakingChange();
  // The store outlives the editor, so leaving the editor has to stop a save still being checked.
  const isMountedRef = useRef(false);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const confirmAndSave = useCallback(async () => {
    const workflowId = selectWorkflowId(store.getState());
    const isStillOpen = () =>
      isMountedRef.current && selectWorkflowId(store.getState()) === workflowId;
    // The draft can change while a check is pending, so check again until the checked draft is
    // the one being saved.
    let yamlString: string;
    do {
      yamlString = getDraftToSave(store.getState());
      const workflow = selectWorkflow(store.getState());
      const disables =
        workflow?.enabled && yamlString && parseDocument(yamlString).get('enabled') === false;
      // Disabling stops every caller, and the disable dialog already lists them.
      const confirmed = disables
        ? await confirmDisable([workflow.id])
        : !confirmBreakingChange || (await confirmBreakingChange(yamlString));
      if (!confirmed || !isStillOpen()) {
        return false;
      }
    } while (getDraftToSave(store.getState()) !== yamlString);
    await saveYaml({ id: workflowId, yamlString });
    return true;
  }, [confirmBreakingChange, confirmDisable, saveYaml, store]);

  return useCallback(() => {
    if (savingStores.has(store)) {
      return Promise.resolve(false);
    }
    savingStores.add(store);
    return confirmAndSave().finally(() => {
      savingStores.delete(store);
    });
  }, [confirmAndSave, store]);
};
