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
import { parseDocument } from 'yaml';
import { useDebouncedValue } from '@kbn/react-hooks';
import { useQuery } from '@kbn/react-query';
import { dependentsImpactQueryOptions } from './dependents_impact_query_options';
import type { WorkflowDependentsImpactResponse } from '../../../../common/lib/workflow_dependents/api';
import { getCalledWorkflowIds } from '../../../../common/lib/workflow_dependents/find_call_sites';
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

const DRAFT_DEBOUNCE_MS = 1000;

// The server reads a draft that doesn't parse as one that runs nothing. `toJS` can still throw on a
// document without errors (an unresolved alias), so that draft is left to the server to check.
const runsWorkflows = (yaml: string): boolean => {
  const document = parseDocument(yaml);
  if (document.errors.length > 0) {
    return false;
  }
  try {
    return getCalledWorkflowIds(document.toJS()).length > 0;
  } catch {
    return true;
  }
};

// Callers don't depend on the draft, so when the saved version has none and runs nothing, a draft
// can only change the result by running another workflow.
const isUnchangedByDraft = (
  savedResult: WorkflowDependentsImpactResponse | undefined,
  draftYaml: string
): boolean =>
  savedResult !== undefined &&
  savedResult.analysis.dependents.length === 0 &&
  savedResult.calledWorkflows.length === 0 &&
  !runsWorkflows(draftYaml);

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
  // Once saved, the saved version is analyzed right away rather than the last draft.
  const checkedDraftYaml = hasUnsavedChanges ? debouncedDraftYaml : undefined;
  const savedVersion = workflow?.lastUpdatedAt;

  const savedResultRef = useRef<{
    id: string;
    savedVersion?: string;
    result: WorkflowDependentsImpactResponse;
  }>();
  const savedResult =
    savedResultRef.current?.id === workflow?.id &&
    savedResultRef.current?.savedVersion === savedVersion
      ? savedResultRef.current?.result
      : undefined;
  const queriedDraftYaml = useMemo(
    () =>
      checkedDraftYaml !== undefined && isUnchangedByDraft(savedResult, checkedDraftYaml)
        ? undefined
        : checkedDraftYaml,
    [checkedDraftYaml, savedResult]
  );

  const { data, isError, isFetching, isPreviousData, refetch } = useQuery({
    ...dependentsImpactQueryOptions(
      http,
      { id: workflow?.id ?? '', savedVersion },
      queriedDraftYaml
    ),
    enabled: Boolean(workflow?.id),
    // While typing, the draft is briefly invalid YAML; keep showing the last good analysis.
    keepPreviousData: true,
    // Other workflows can start or stop running this one while it isn't open.
    refetchOnMount: 'always',
  });
  if (data && !isPreviousData && workflow?.id && queriedDraftYaml === undefined) {
    savedResultRef.current = { id: workflow.id, savedVersion, result: data };
  }

  // The last result of this workflow's own queries. `keepPreviousData` can hand over another
  // workflow's result after navigating, and drops the previous one once a newer query fails.
  const lastResultRef = useRef<{ id: string; result: WorkflowDependentsImpactResponse }>();
  if (data && !isPreviousData && workflow?.id) {
    lastResultRef.current = { id: workflow.id, result: data };
  }
  const shown =
    lastResultRef.current?.id === workflow?.id ? lastResultRef.current?.result : undefined;

  const savedYaml = workflow?.yaml;
  const isLoading = !shown && !isError && Boolean(workflow?.id);
  const hasError = isError && !shown;
  const isRefreshError = isError && Boolean(shown);
  const isDebouncing = checkedDraftYaml !== (hasUnsavedChanges ? draftYaml : undefined);
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
