/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiButtonIcon,
  EuiCopy,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiText,
  EuiTextTruncate,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useUiSetting } from '@kbn/kibana-react-plugin/public';
import type { WorkflowExecutionDto } from '@kbn/workflows';
import { WORKFLOWS_UI_SHOW_EXECUTOR_SETTING_ID } from '@kbn/workflows/common/constants';
import { ServiceAccountName } from '../../../entities/service_accounts';
import { executedByFallbackLabel, getExecutedByLabel } from '../../../entities/user_profiles';
import { useKibana } from '../../../hooks/use_kibana';
import { formatDuration } from '../../../shared/lib/format_duration';
import { getStatusLabel } from '../../../shared/translations/status_translations';
import { getExecutionStatusIcon } from '../../../shared/ui/status_badge';
import type { FailedStepPosition } from '../lib/get_failed_step_position';

const i18nTexts = {
  result: i18n.translate('workflows.executionFlyout.result', { defaultMessage: 'Result' }),
  executionTime: i18n.translate('workflows.executionFlyout.executionTime', {
    defaultMessage: 'Execution time',
  }),
  executedBy: i18n.translate('workflows.executionFlyout.executedBy', {
    defaultMessage: 'Triggered by',
  }),
  runAs: i18n.translate('workflows.executionFlyout.runAs', { defaultMessage: 'Run as' }),
  runAsInherited: i18n.translate('workflows.execution.inheritedRunAsLabel', {
    defaultMessage: 'Run as (inherited from parent)',
  }),
};

interface ExecutionResultCardProps {
  workflowExecution: WorkflowExecutionDto;
  failedPosition: FailedStepPosition | null;
  /** Set when the run is paused on waitForInput. Result links to that step. */
  waitingStepExecutionId?: string;
  onFocusFailedStep: (stepExecutionId: string) => void;
}

/** Result, execution time, who triggered the run and the identity it runs as. */
export const ExecutionResultCard = ({
  workflowExecution,
  failedPosition,
  waitingStepExecutionId,
  onFocusFailedStep,
}: ExecutionResultCardProps) => {
  const { euiTheme } = useEuiTheme();
  const formattedDuration = useMemo(
    () => (workflowExecution.duration != null ? formatDuration(workflowExecution.duration) : null),
    [workflowExecution.duration]
  );
  const executedByValue = workflowExecution.executedBy?.trim() || '';
  const showExecutor = useUiSetting<boolean>(WORKFLOWS_UI_SHOW_EXECUTOR_SETTING_ID, true);
  const { cloud } = useKibana().services;
  const showUnresolvedExecutors = !cloud?.isServerlessEnabled;
  const resolvedExecutedBy = showExecutor
    ? getExecutedByLabel(
        workflowExecution.executedByProfile,
        executedByFallbackLabel(executedByValue, showUnresolvedExecutors)
      )
    : undefined;
  const executedByDisplay = resolvedExecutedBy || '-';
  const { effectiveIdentity } = workflowExecution;
  const showRunAs = effectiveIdentity?.type === 'service_account';
  const cellCss = {
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    gap: '2px',
    minWidth: 0,
    paddingInline: '8px',
    boxShadow: `-1px 0 0 0 ${euiTheme.colors.borderBaseSubdued}`,
  };

  return (
    <div
      data-execution-status={workflowExecution.status}
      css={{
        border: `1px solid ${euiTheme.colors.borderBaseSubdued}`,
        borderRadius: '10px',
        padding: '12px',
        minWidth: 0,
        maxWidth: '100%',
        overflow: 'hidden',
      }}
    >
      {/* With "Run as", the 4 cells form a 2x2 grid. Without it, the 3 cells share one row.
          Each cell draws its separator as a left shadow; overflow clips the shadow of the first
          cell in every row. */}
      <div
        css={{
          display: 'grid',
          gridTemplateColumns: `repeat(${showRunAs ? 2 : 3}, minmax(0, 1fr))`,
          rowGap: '12px',
          marginInline: '-8px',
          overflow: 'hidden',
        }}
      >
        <div css={cellCss}>
          <EuiText size="s" color="subdued" css={{ fontWeight: 500, fontSize: '12px' }}>
            {i18nTexts.result}
          </EuiText>
          <EuiFlexGroup
            gutterSize="none"
            css={{ gap: '4px', minWidth: 0, flexGrow: 0 }}
            alignItems="center"
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              {getExecutionStatusIcon(euiTheme, workflowExecution.status)}
            </EuiFlexItem>
            <EuiFlexItem grow={false} css={{ minWidth: 0 }}>
              {failedPosition ? (
                <EuiLink
                  color="danger"
                  data-test-subj="workflowExecutionFlyoutResultLink"
                  onClick={() => {
                    onFocusFailedStep(failedPosition.step.id);
                  }}
                  css={{
                    fontWeight: 600,
                    fontSize: '12px',
                    textDecoration: 'underline',
                  }}
                >
                  {failedPosition.index != null
                    ? i18n.translate('workflows.executionFlyout.result.failedAtStep', {
                        defaultMessage: 'Failed at step {n}',
                        values: {
                          n: failedPosition.index,
                        },
                      })
                    : i18n.translate('workflows.executionFlyout.result.failed', {
                        defaultMessage: 'Failed',
                      })}
                </EuiLink>
              ) : waitingStepExecutionId ? (
                <EuiLink
                  color="warning"
                  data-test-subj="workflowExecutionFlyoutResultLink"
                  onClick={() => {
                    onFocusFailedStep(waitingStepExecutionId);
                  }}
                  css={{
                    fontWeight: 600,
                    fontSize: '12px',
                    textDecoration: 'underline',
                  }}
                >
                  {i18n.translate('workflows.executionFlyout.result.provideActionLinkText', {
                    defaultMessage: 'Provide action',
                  })}
                </EuiLink>
              ) : (
                <EuiText
                  size="s"
                  css={{ fontWeight: 600, fontSize: '12px' }}
                  data-test-subj="workflowExecutionStatus"
                >
                  {getStatusLabel(workflowExecution.status)}
                </EuiText>
              )}
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>

        <div css={cellCss}>
          <EuiText size="s" color="subdued" css={{ fontWeight: 500, fontSize: '12px' }}>
            {i18nTexts.executionTime}
          </EuiText>
          <EuiFlexGroup
            gutterSize="none"
            css={{ gap: '4px', minWidth: 0, flexGrow: 0 }}
            alignItems="center"
            responsive={false}
          >
            <EuiFlexItem grow={false}>
              <EuiIcon type="clock" color="subdued" size="m" aria-hidden={true} />
            </EuiFlexItem>
            <EuiFlexItem grow={false} css={{ minWidth: 0 }}>
              <EuiText size="s" css={{ fontWeight: 600, fontSize: '12px' }}>
                {formattedDuration ?? '-'}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>

        <div css={cellCss} data-test-subj="workflowExecutionFlyoutExecutedBy">
          <EuiText size="s" color="subdued" css={{ fontWeight: 500, fontSize: '12px' }}>
            {i18nTexts.executedBy}
          </EuiText>
          <EuiFlexGroup
            gutterSize="xs"
            alignItems="center"
            responsive={false}
            wrap={false}
            css={{ minWidth: 0, width: '100%', flexGrow: 0 }}
          >
            <EuiFlexItem grow css={{ minWidth: 0 }}>
              <EuiToolTip content={executedByDisplay} display="block">
                <EuiText
                  tabIndex={0}
                  size="s"
                  css={{
                    fontWeight: 600,
                    fontSize: '12px',
                    minWidth: 0,
                  }}
                >
                  <EuiTextTruncate text={executedByDisplay} truncation="middle" />
                </EuiText>
              </EuiToolTip>
            </EuiFlexItem>
            {resolvedExecutedBy ? (
              <EuiFlexItem grow={false}>
                <EuiCopy textToCopy={executedByValue}>
                  {(copy) => {
                    const copyLabel = i18n.translate('workflows.executionFlyout.executedBy.copy', {
                      defaultMessage: 'Copy executed by',
                    });
                    return (
                      <EuiToolTip content={copyLabel} disableScreenReaderOutput>
                        <EuiButtonIcon
                          iconType="copy"
                          size="xs"
                          color="text"
                          aria-label={copyLabel}
                          onClick={copy}
                          data-test-subj="workflowExecutionFlyoutExecutedByCopy"
                        />
                      </EuiToolTip>
                    );
                  }}
                </EuiCopy>
              </EuiFlexItem>
            ) : null}
          </EuiFlexGroup>
        </div>

        {effectiveIdentity?.type === 'service_account' && (
          <div css={cellCss} data-test-subj="workflowExecutionFlyoutRunAs">
            <EuiText size="s" color="subdued" css={{ fontWeight: 500, fontSize: '12px' }}>
              {effectiveIdentity.inheritedFrom ? i18nTexts.runAsInherited : i18nTexts.runAs}
            </EuiText>
            <EuiText size="s" css={{ fontSize: '12px', minWidth: 0 }}>
              <ServiceAccountName id={effectiveIdentity.id} />
            </EuiText>
          </div>
        )}
      </div>
    </div>
  );
};
