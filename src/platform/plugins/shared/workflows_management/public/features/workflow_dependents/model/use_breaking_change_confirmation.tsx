/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonEmpty,
  EuiConfirmModal,
  EuiSpacer,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useCallback, useRef, useState } from 'react';
import { useStore } from 'react-redux-v7';
import { i18n } from '@kbn/i18n';
import { useQueryClient } from '@kbn/react-query';
import { dependentsImpactQueryOptions } from './dependents_impact_query_options';
import { isBreakingRun } from '../../../../common/lib/workflow_dependents/api';
import type { DependentImpact } from '../../../../common/lib/workflow_dependents/types';
import type { RootState } from '../../../entities/workflows/store/types';
import {
  selectHasChanges,
  selectWorkflow,
  selectYamlString,
} from '../../../entities/workflows/store/workflow_detail/selectors';
import { useKibana } from '../../../hooks/use_kibana';
import { getIssueMessage } from '../ui/translations';

/**
 * Asks the user to confirm before saving a draft that breaks workflows calling this one. The
 * server grades the exact draft being saved; when it can't, the save goes ahead.
 */
export const useBreakingChangeConfirmation = (
  onReviewImpact: () => void
): { confirmBreakingChange: () => Promise<boolean>; confirmModal: JSX.Element | null } => {
  const { http } = useKibana().services;
  const queryClient = useQueryClient();
  const store = useStore<RootState>();
  const modalTitleId = useGeneratedHtmlId();
  const [pending, setPending] = useState<{
    workflowName: string;
    breakingDependents: DependentImpact[];
    indirectBreaking: number;
  } | null>(null);
  const resolveRef = useRef<(confirmed: boolean) => void>();

  const getSaveImpact = useCallback(async (): Promise<{
    breakingDependents: DependentImpact[];
    indirectBreaking: number;
  }> => {
    const none = { breakingDependents: [], indirectBreaking: 0 };
    const state = store.getState();
    const workflow = selectWorkflow(state);
    const draftYaml = selectYamlString(state);
    if (!workflow || !selectHasChanges(state)) {
      return none;
    }
    try {
      const { analysis } = await queryClient.fetchQuery(
        dependentsImpactQueryOptions(
          http,
          { id: workflow.id, savedVersion: workflow.lastUpdatedAt },
          draftYaml
        )
      );
      return {
        breakingDependents: analysis.dependents.filter(isBreakingRun),
        indirectBreaking: analysis.summary.indirectBreaking,
      };
    } catch {
      return none;
    }
  }, [http, queryClient, store]);

  const confirmBreakingChange = useCallback(async () => {
    const impact = await getSaveImpact();
    if (impact.breakingDependents.length === 0) {
      return true;
    }
    const workflowName = selectWorkflow(store.getState())?.name ?? '';
    return new Promise<boolean>((resolve) => {
      resolveRef.current?.(false);
      resolveRef.current = resolve;
      setPending({ workflowName, ...impact });
    });
  }, [getSaveImpact, store]);

  const close = (confirmed: boolean) => {
    resolveRef.current?.(confirmed);
    resolveRef.current = undefined;
    setPending(null);
  };

  const confirmModal = pending && (
    <EuiConfirmModal
      title={i18n.translate('workflows.dependents.confirmModal.title', {
        defaultMessage:
          'Save changes that break {count, plural, one {# workflow} other {# workflows}}?',
        values: { count: pending.breakingDependents.length },
      })}
      titleProps={{ id: modalTitleId }}
      aria-labelledby={modalTitleId}
      onCancel={() => close(false)}
      onConfirm={() => close(true)}
      cancelButtonText={i18n.translate('workflows.dependents.confirmModal.cancel', {
        defaultMessage: 'Cancel',
      })}
      confirmButtonText={i18n.translate('workflows.dependents.confirmModal.confirm', {
        defaultMessage: 'Save anyway',
      })}
      buttonColor="danger"
      defaultFocusedButton="cancel"
      data-test-subj="workflowBreakingChangeConfirmModal"
    >
      <EuiText size="s">
        <p>
          {i18n.translate('workflows.dependents.confirmModal.body', {
            defaultMessage: 'These workflows run {workflowName} and will fail after you save:',
            values: { workflowName: pending.workflowName },
          })}
        </p>
        <ul>
          {pending.breakingDependents.map(({ workflowId, workflowName: callerName, issues }) => {
            const firstIssue = issues.find(
              ({ isNew, severity }) => isNew && severity === 'breaking'
            );
            return (
              <li key={workflowId}>
                <strong>{callerName}</strong>
                {firstIssue && `: ${getIssueMessage(firstIssue, pending.workflowName)}`}
              </li>
            );
          })}
        </ul>
        {pending.indirectBreaking > 0 && (
          <p>
            {i18n.translate('workflows.dependents.confirmModal.indirect', {
              defaultMessage:
                '{count, plural, one {# more workflow} other {# more workflows}} further up the chain {count, plural, one {runs} other {run}} these and will fail or get empty values.',
              values: { count: pending.indirectBreaking },
            })}
          </p>
        )}
      </EuiText>
      <EuiSpacer size="s" />
      <EuiButtonEmpty
        size="s"
        flush="left"
        iconType="inspect"
        onClick={() => {
          close(false);
          onReviewImpact();
        }}
        data-test-subj="workflowBreakingChangeReviewButton"
      >
        {i18n.translate('workflows.dependents.confirmModal.review', {
          defaultMessage: 'See what breaks',
        })}
      </EuiButtonEmpty>
    </EuiConfirmModal>
  );

  return { confirmBreakingChange, confirmModal };
};
