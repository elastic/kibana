/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useQuery } from '@kbn/react-query';
import type { WorkflowDetailDto } from '@kbn/workflows';
import { visitNestedSteps, WorkflowExecuteStepInputSchema } from '@kbn/workflows';
import type { ChildWorkflowApprovalReview } from '../../../../common/child_workflow_approvals';
import { ServiceAccountName } from '../../../entities/service_accounts';
import { WorkflowChangeHistoryMonacoPreview } from '../../../features/change_history/workflow_change_history_monaco_preview';
import { useKibana } from '../../../hooks/use_kibana';

export const ChildWorkflowApprovals = ({
  workflow,
  hasUnsavedChanges,
}: {
  workflow: WorkflowDetailDto | undefined;
  hasUnsavedChanges: boolean;
}): JSX.Element | null => {
  const { http, security } = useKibana().services;
  const [review, setReview] = useState<ChildWorkflowApprovalReview>();
  const [selected, setSelected] = useState(0);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string>();
  let hasInheritance = false;
  if (workflow?.definition)
    visitNestedSteps(workflow.definition.steps, ({ step }) => {
      if (step.type !== 'workflow.execute' && step.type !== 'workflow.executeAsync') return;
      const parsed = WorkflowExecuteStepInputSchema.safeParse(step.with);
      if (
        parsed.success &&
        (parsed.data.inheritRunAs === true ||
          parsed.data.runAsMode === 'inherit' ||
          parsed.data.runAsMode === 'override')
      )
        hasInheritance = true;
    });
  const enabled =
    security.serviceAccounts.isEnabled() &&
    !!workflow?.definition?.settings?.run_as &&
    hasInheritance;
  const endpoint = `/internal/workflows/${encodeURIComponent(workflow?.id ?? '')}/child_approvals`;
  const query = useQuery({
    queryKey: ['workflows', 'childApprovals', workflow?.id, workflow?.lastUpdatedAt],
    queryFn: () => http.get<ChildWorkflowApprovalReview>(endpoint),
    enabled,
    retry: false,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });
  if (!enabled) return null;
  const pending = query.data?.children.filter((child) => child.status !== 'approved').length ?? 0;
  const child = review?.children[selected];
  const approve = async () => {
    if (!review) return;
    setApproving(true);
    setError(undefined);
    try {
      await http.post(endpoint, { body: JSON.stringify({ reviewToken: review.reviewToken }) });
      setReview(undefined);
      await query.refetch();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setApproving(false);
    }
  };
  return (
    <>
      <EuiCallOut
        size="s"
        color={pending || query.isError ? 'warning' : 'primary'}
        data-test-subj="childWorkflowApprovalStatus"
        title={
          query.isError
            ? i18n.translate('workflows.childApprovals.unavailableTitle', {
                defaultMessage: 'Unable to review child approvals',
              })
            : !query.data
            ? i18n.translate('workflows.childApprovals.loadingTitle', {
                defaultMessage: 'Checking child approvals',
              })
            : pending
            ? i18n.translate('workflows.childApprovals.pendingTitle', {
                defaultMessage: 'Child workflows need approval',
              })
            : i18n.translate('workflows.childApprovals.approvedTitle', {
                defaultMessage: 'Child workflows use approved versions',
              })
        }
      >
        <EuiText size="s">
          <p>
            {i18n.translate('workflows.childApprovals.behaviorDescription', {
              defaultMessage:
                'Edits do not change the code running under the inherited service account. Calls continue using their approved versions. New calls require approval before they can run.',
            })}
          </p>
        </EuiText>
        <EuiButtonEmpty
          size="s"
          isLoading={query.isFetching}
          disabled={!query.data || hasUnsavedChanges}
          data-test-subj="reviewChildWorkflowApprovals"
          onClick={() => {
            setReview(query.data);
            setSelected(0);
            setError(undefined);
          }}
        >
          {i18n.translate('workflows.childApprovals.reviewButtonLabel', {
            defaultMessage: 'Review child versions',
          })}
        </EuiButtonEmpty>
        {hasUnsavedChanges && (
          <EuiText size="s">
            {i18n.translate('workflows.childApprovals.saveDescription', {
              defaultMessage: 'Save the parent before reviewing approvals.',
            })}
          </EuiText>
        )}
        {query.isError && (
          <EuiText size="s">
            {query.error instanceof Error
              ? query.error.message
              : i18n.translate('workflows.childApprovals.loadErrorMessage', {
                  defaultMessage: 'Unable to load child versions.',
                })}
          </EuiText>
        )}
        {query.isError && (
          <EuiButtonEmpty size="s" onClick={() => query.refetch()}>
            {i18n.translate('workflows.childApprovals.retryButtonLabel', {
              defaultMessage: 'Retry',
            })}
          </EuiButtonEmpty>
        )}
      </EuiCallOut>
      {review && (
        <EuiFlyout
          size="l"
          onClose={() => setReview(undefined)}
          aria-labelledby="childApprovalTitle"
          ownFocus
        >
          <EuiFlyoutHeader hasBorder>
            <EuiTitle>
              <h2 id="childApprovalTitle">
                {i18n.translate('workflows.childApprovals.reviewTitle', {
                  defaultMessage: 'Review child workflow permissions',
                })}
              </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiText size="s">
              <p>
                {i18n.translate('workflows.childApprovals.identityLabel', {
                  defaultMessage: 'Delegated service account',
                })}
              </p>
            </EuiText>
            <ServiceAccountName id={review.serviceAccountId} />
            <EuiSpacer />
            <EuiText>
              <p>
                {i18n.translate('workflows.childApprovals.securityDescription', {
                  defaultMessage:
                    'Approving these versions permits this code, including nested inherited calls, to execute as the parent service account. Existing executions keep their original approved snapshots.',
                })}
              </p>
            </EuiText>
            <EuiSpacer />
            <EuiSelect
              aria-label={i18n.translate('workflows.childApprovals.childAriaLabel', {
                defaultMessage: 'Child workflow to review',
              })}
              value={selected}
              options={review.children.map((entry, index) => ({
                value: index,
                text: `${entry.path.join(' / ')} — ${entry.name}`,
              }))}
              onChange={(event) => setSelected(Number(event.target.value))}
            />
            <EuiSpacer />
            {child && (
              <>
                <EuiText size="s">
                  <p>
                    {child.approvedYaml !== undefined
                      ? i18n.translate('workflows.childApprovals.versionsDescription', {
                          defaultMessage: 'Approved V{approved} → Current V{current}',
                          values: {
                            approved: child.approvedVersion ?? 1,
                            current: child.currentVersion ?? 1,
                          },
                        })
                      : i18n.translate('workflows.childApprovals.firstApprovalDescription', {
                          defaultMessage: 'No approved version → Current V{current}',
                          values: { current: child.currentVersion ?? 1 },
                        })}
                  </p>
                </EuiText>
                <div
                  css={css`
                    height: 55vh;
                    min-height: 240px;
                  `}
                >
                  <WorkflowChangeHistoryMonacoPreview
                    baselineYaml={child.approvedYaml ?? ''}
                    targetYaml={child.currentYaml}
                  />
                </div>
              </>
            )}
            {error && (
              <EuiCallOut
                announceOnMount
                color="danger"
                title={i18n.translate('workflows.childApprovals.failedTitle', {
                  defaultMessage:
                    'Approval failed. Close and reopen the review to load current changes.',
                })}
              >
                <p>{error}</p>
              </EuiCallOut>
            )}
            {!review.canApprove && (
              <EuiCallOut
                announceOnMount
                title={i18n.translate('workflows.childApprovals.permissionTitle', {
                  defaultMessage: 'Approval requires workflow edit permission and manage_security.',
                })}
              />
            )}
          </EuiFlyoutBody>
          <EuiFlyoutFooter>
            <EuiFlexGroup justifyContent="spaceBetween" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty onClick={() => setReview(undefined)}>
                  {i18n.translate('workflows.childApprovals.cancelButtonLabel', {
                    defaultMessage: 'Cancel',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="approveChildWorkflowVersions"
                  fill
                  isLoading={approving}
                  disabled={!review.canApprove || hasUnsavedChanges || review.children.length === 0}
                  onClick={approve}
                >
                  {i18n.translate('workflows.childApprovals.approveButtonLabel', {
                    defaultMessage: 'Approve reviewed versions',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyout>
      )}
    </>
  );
};
