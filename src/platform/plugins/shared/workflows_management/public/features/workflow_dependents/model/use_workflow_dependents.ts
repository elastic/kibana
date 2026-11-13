/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo, useRef } from 'react';
import { useSelector } from 'react-redux-v7';
import { useDebouncedValue } from '@kbn/react-hooks';
import { useQuery } from '@kbn/react-query';
import { dependentsImpactQueryOptions } from './dependents_impact_query_options';
import type { WorkflowDependentsImpactResponse } from '../../../../common/lib/workflow_dependents/api';
import type {
  CalledWorkflowImpact,
  DependentsAnalysis,
} from '../../../../common/lib/workflow_dependents/types';
import {
  selectHasChanges,
  selectWorkflow,
  selectYamlString,
} from '../../../entities/workflows/store/workflow_detail/selectors';
import { useKibana } from '../../../hooks/use_kibana';

const DRAFT_DEBOUNCE_MS = 400;

export interface UseWorkflowDependentsResult {
  analysis?: DependentsAnalysis;
  /** Workflows the open workflow runs, checked against the current draft. */
  calledWorkflows?: CalledWorkflowImpact[];
  hasUnsavedChanges: boolean;
  /** YAML of the saved version, the baseline of the unsaved-changes diff. */
  savedYaml?: string;
  draftYaml?: string;
  isLoading: boolean;
  /** True when nothing could be loaded. */
  isError: boolean;
  /** True while the results shown are for an earlier version of the draft. */
  isUpdating: boolean;
  /** True when checking the latest draft failed, so the results shown are for an earlier one. */
  isRefreshError: boolean;
  refetch: () => void;
}

/** Live analysis of the workflows that run the open workflow, and the workflows it runs. */
export const useWorkflowDependents = (): UseWorkflowDependentsResult => {
  const { http } = useKibana().services;
  const workflow = useSelector(selectWorkflow);
  const hasUnsavedChanges = useSelector(selectHasChanges);
  const draftYaml = useSelector(selectYamlString);
  const debouncedDraftYaml = useDebouncedValue(
    hasUnsavedChanges ? draftYaml : undefined,
    DRAFT_DEBOUNCE_MS
  );

  const { data, isInitialLoading, isError, isFetching, isPreviousData, refetch } = useQuery({
    ...dependentsImpactQueryOptions(
      http,
      { id: workflow?.id ?? '', savedVersion: workflow?.lastUpdatedAt },
      debouncedDraftYaml
    ),
    enabled: Boolean(workflow?.id),
    // While typing, the draft is briefly invalid YAML; keep showing the last good analysis.
    keepPreviousData: true,
  });

  // `keepPreviousData` drops the previous result once the newer query fails, so keep it here.
  const lastResultRef = useRef<{ id: string; result: WorkflowDependentsImpactResponse }>();
  if (data && workflow?.id) {
    lastResultRef.current = { id: workflow.id, result: data };
  }
  const shown =
    data ??
    (lastResultRef.current?.id === workflow?.id ? lastResultRef.current?.result : undefined);

  const savedYaml = workflow?.yaml;
  const isLoading = isInitialLoading;
  const hasError = isError && !shown;
  const isRefreshError = isError && Boolean(shown);
  const isDebouncing = debouncedDraftYaml !== (hasUnsavedChanges ? draftYaml : undefined);
  const isUpdating =
    Boolean(shown) && !isRefreshError && (isFetching || isPreviousData || isDebouncing);
  return useMemo(
    () => ({
      analysis: shown?.analysis,
      calledWorkflows: shown?.calledWorkflows,
      hasUnsavedChanges,
      savedYaml,
      draftYaml,
      isLoading,
      isError: hasError,
      isUpdating,
      isRefreshError,
      refetch,
    }),
    [
      shown,
      hasUnsavedChanges,
      savedYaml,
      draftYaml,
      isLoading,
      hasError,
      isUpdating,
      isRefreshError,
      refetch,
    ]
  );
};
