/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo, useRef } from 'react';
import { useSelector } from 'react-redux';
import type {
  ChangeHistoryListItemChanges,
  ChangeHistoryPendingChange,
} from '@kbn/change-history-ui';

import { computeWorkflowYamlChanges } from './compute_workflow_yaml_changes';
import { WORKFLOW_UNSAVED_CHANGE_ID } from './constants';
import { toWorkflowChangeHistorySnapshot } from './map_workflow_history_item';
import { UNSAVED_CHANGES_ACTION, UNSAVED_CHANGES_ACTOR } from './translations';
import {
  selectHasChanges,
  selectWorkflow,
  selectYamlString,
} from '../../entities/workflows/store/workflow_detail/selectors';

export interface WorkflowPendingChangeMetadata {
  hasUnsavedChanges: boolean;
  unsavedTimestamp: string | undefined;
}

const toPendingChanges = (
  baselineYaml: string,
  targetYaml: string
): ChangeHistoryListItemChanges | undefined => {
  const computedChanges = computeWorkflowYamlChanges(baselineYaml, targetYaml);
  if (computedChanges.count === 0) {
    return undefined;
  }

  return {
    count: computedChanges.count,
    ...(computedChanges.summaryGroups?.length ? { summary: computedChanges.summaryGroups } : {}),
  };
};

/** Tracks dirty state and edit-start timestamp without subscribing to yaml content. */
export const useWorkflowPendingChangeMetadata = (): WorkflowPendingChangeMetadata => {
  const hasUnsavedChanges = useSelector(selectHasChanges);
  const unsavedTimestampRef = useRef<string | undefined>();

  // Capture edit-start time synchronously so the pending row appears on the first dirty render.
  if (hasUnsavedChanges) {
    unsavedTimestampRef.current ??= new Date().toISOString();
  } else {
    unsavedTimestampRef.current = undefined;
  }

  return useMemo(
    () => ({
      hasUnsavedChanges,
      unsavedTimestamp: unsavedTimestampRef.current,
    }),
    [hasUnsavedChanges]
  );
};

/** Builds the full pending row, including yaml diff, when history UI is active. */
export const useWorkflowPendingChangeDetails = (
  metadata: WorkflowPendingChangeMetadata
): ChangeHistoryPendingChange | undefined => {
  const yamlString = useSelector(selectYamlString);
  const workflow = useSelector(selectWorkflow);

  return useMemo(() => {
    const { hasUnsavedChanges, unsavedTimestamp } = metadata;

    if (!hasUnsavedChanges || !workflow?.yaml || !unsavedTimestamp) {
      return undefined;
    }

    return {
      id: WORKFLOW_UNSAVED_CHANGE_ID,
      timestamp: unsavedTimestamp,
      actor: { name: UNSAVED_CHANGES_ACTOR },
      action: UNSAVED_CHANGES_ACTION,
      snapshot: toWorkflowChangeHistorySnapshot(yamlString),
      changes: toPendingChanges(workflow.yaml, yamlString),
    };
  }, [metadata, workflow?.yaml, yamlString]);
};

/** Test and story helper — always computes the full pending row. */
export const useWorkflowPendingChange = (): ChangeHistoryPendingChange | undefined => {
  const metadata = useWorkflowPendingChangeMetadata();
  return useWorkflowPendingChangeDetails(metadata);
};
