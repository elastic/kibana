/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiBasicTableColumn, EuiThemeComputed } from '@elastic/eui';
import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLoadingSpinner,
  EuiText,
  EuiTextTruncate,
  EuiToolTip,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { getUserDisplayName, UserAvatar } from '@kbn/user-profile-components';
import { ExecutionStatus, type WorkflowExecutionListItemDto } from '@kbn/workflows';
import { formatDuration } from '../../../shared/lib/format_duration';
import { getStatusLabel } from '../../../shared/translations';
import {
  formatExecutionTimestamp,
  resolveKibanaTimeZone,
} from '../../../shared/ui/use_formatted_date';
import { getRunMode } from '../../workflow_execution_detail/lib/get_run_mode';

/** Fixed column widths for the execution-history table (panel must not scroll horizontally). */
export const EXECUTION_HISTORY_COLUMN_WIDTHS = {
  status: '120px',
  /** Fits `Yesterday 22:04` / `Aug 17 14:03` without clipping. */
  started: '120px',
  duration: '72px',
} as const;

const EM_DASH = '\u2014';

const getStatusBadgeColor = (
  status: ExecutionStatus
): 'success' | 'danger' | 'default' | 'warning' => {
  switch (status) {
    case ExecutionStatus.COMPLETED:
      return 'success';
    case ExecutionStatus.FAILED:
      return 'danger';
    case ExecutionStatus.WAITING:
    case ExecutionStatus.WAITING_FOR_INPUT:
    case ExecutionStatus.WAITING_FOR_CHILD:
    case ExecutionStatus.QUEUED:
      return 'warning';
    default:
      return 'default';
  }
};

const StatusPill = ({ status }: { status: ExecutionStatus }) => {
  const label = getStatusLabel(status);
  const color = getStatusBadgeColor(status);

  if (status === ExecutionStatus.RUNNING) {
    return (
      <EuiBadge color="default" data-test-subj="workflowExecutionListStatusPill">
        <EuiFlexGroup
          alignItems="center"
          gutterSize="xs"
          responsive={false}
          wrap={false}
          css={css`
            flex-wrap: nowrap;
          `}
        >
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner size="s" />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{label}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiBadge>
    );
  }

  return (
    <EuiBadge color={color} data-test-subj="workflowExecutionListStatusPill">
      {label}
    </EuiBadge>
  );
};

const RunModeFlask = ({ isTestRun, stepId }: { isTestRun: boolean; stepId?: string | null }) => {
  const runModeInfo = getRunMode({ isTestRun, stepId });
  if (runModeInfo.runMode === 'production') {
    return null;
  }

  const tooltip =
    runModeInfo.runMode === 'stepTest'
      ? i18n.translate('workflows.workflowExecutionListItem.stepTestIconTitle', {
          defaultMessage: 'Step test: {stepName}',
          values: { stepName: runModeInfo.stepTestTargetName ?? '' },
        })
      : i18n.translate('workflows.workflowExecutionListItem.testRunIconTitle', {
          defaultMessage: 'Test run',
        });

  return (
    <EuiToolTip
      content={tooltip}
      position="top"
      anchorProps={{
        css: css`
          display: inline-flex;
          align-items: center;
          line-height: 0;
        `,
      }}
    >
      <span
        tabIndex={0}
        aria-label={tooltip}
        css={css`
          display: inline-flex;
          align-items: center;
          line-height: 0;
        `}
        data-test-subj="workflowExecutionListItemRunModeIcon"
      >
        <EuiIcon
          type="flask"
          color="subdued"
          aria-hidden={true}
          css={css`
            display: block;
          `}
        />
      </span>
    </EuiToolTip>
  );
};

export interface ExecutionHistoryColumnContext {
  euiTheme: EuiThemeComputed;
  showExecutor: boolean;
  executedByUserProfiles: Map<string, UserProfileWithAvatar>;
  showUnresolvedExecutors: boolean;
  /** Kibana `dateFormat:tz` (`Browser` or an IANA zone). */
  timeZoneSetting?: string;
}

const getExecutedByDisplayName = (
  execution: WorkflowExecutionListItemDto,
  ctx: ExecutionHistoryColumnContext
): string | undefined => {
  if (!ctx.showExecutor || !execution.executedBy) {
    return undefined;
  }
  const profile = ctx.executedByUserProfiles.get(execution.executedBy);
  if (profile?.user) {
    return getUserDisplayName(profile.user) || undefined;
  }
  return ctx.showUnresolvedExecutors ? execution.executedBy : undefined;
};

export const getExecutionHistoryColumns = (
  ctx: ExecutionHistoryColumnContext
): Array<EuiBasicTableColumn<WorkflowExecutionListItemDto>> => {
  const { euiTheme, timeZoneSetting } = ctx;
  const timeZoneLabel = resolveKibanaTimeZone(timeZoneSetting);

  const startedHeaderTooltip = i18n.translate(
    'workflows.workflowExecutionList.column.started.timezoneTooltip',
    {
      defaultMessage: 'Times shown in {zone}',
      values: { zone: timeZoneLabel },
    }
  );

  return [
    {
      field: 'status',
      name: i18n.translate('workflows.workflowExecutionList.column.status', {
        defaultMessage: 'Status',
      }),
      width: EXECUTION_HISTORY_COLUMN_WIDTHS.status,
      truncateText: true,
      render: (_status: ExecutionStatus, execution) => (
        <EuiFlexGroup
          alignItems="center"
          gutterSize="xs"
          responsive={false}
          wrap={false}
          data-test-subj="workflowExecutionListStatusCell"
        >
          <EuiFlexItem grow={false}>
            <StatusPill status={execution.status} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <RunModeFlask isTestRun={execution.isTestRun} stepId={execution.stepId} />
          </EuiFlexItem>
        </EuiFlexGroup>
      ),
    },
    {
      field: 'startedAt',
      name: (
        <EuiToolTip content={startedHeaderTooltip} position="top">
          <span tabIndex={0}>
            {i18n.translate('workflows.workflowExecutionList.column.started', {
              defaultMessage: 'Started',
            })}
          </span>
        </EuiToolTip>
      ),
      width: EXECUTION_HISTORY_COLUMN_WIDTHS.started,
      // We render a compact absolute label; avoid EUI's cell ellipsis clipping "Yesterday …".
      truncateText: false,
      render: (startedAt: string | null) => {
        const compressed = formatExecutionTimestamp(startedAt, 'started', { timeZoneSetting });
        const full = formatExecutionTimestamp(startedAt, 'tooltip', { timeZoneSetting });

        const content = (
          <EuiText
            size="xs"
            color="subdued"
            data-test-subj="workflowExecutionListStartedCell"
            css={css`
              white-space: nowrap;
            `}
          >
            {compressed ??
              i18n.translate('workflows.workflowExecutionListItem.notStarted', {
                defaultMessage: 'Not started',
              })}
          </EuiText>
        );

        return full ? (
          <EuiToolTip content={full} position="top">
            <span tabIndex={0}>{content}</span>
          </EuiToolTip>
        ) : (
          content
        );
      },
    },
    {
      field: 'duration',
      name: i18n.translate('workflows.workflowExecutionList.column.duration', {
        defaultMessage: 'Duration',
      }),
      width: EXECUTION_HISTORY_COLUMN_WIDTHS.duration,
      align: 'right',
      truncateText: true,
      render: (duration: number | null, execution) => {
        const showDash =
          execution.status === ExecutionStatus.RUNNING ||
          duration == null ||
          !Number.isFinite(duration);
        return (
          <EuiText
            size="xs"
            color="subdued"
            data-test-subj="workflowExecutionListDurationCell"
            css={css`
              font-variant-numeric: tabular-nums;
              text-align: right;
              color: ${euiTheme.colors.textSubdued};
            `}
          >
            {showDash ? EM_DASH : formatDuration(duration)}
          </EuiText>
        );
      },
    },
    {
      field: 'executedBy',
      name: i18n.translate('workflows.workflowExecutionList.column.executedBy', {
        defaultMessage: 'Executed by',
      }),
      // Flexible far-right column. truncateText gives the cell max-width/overflow so
      // EuiTextTruncate can measure a real width (width 0 renders an empty visible label).
      truncateText: true,
      render: (_executedBy: string | undefined, execution) => {
        const displayName = getExecutedByDisplayName(execution, ctx);
        const profile = execution.executedBy
          ? ctx.executedByUserProfiles.get(execution.executedBy)
          : undefined;

        if (!displayName) {
          return (
            <EuiText size="xs" color="subdued" data-test-subj="workflowExecutionListExecutedByCell">
              {EM_DASH}
            </EuiText>
          );
        }

        return (
          <EuiFlexGroup
            alignItems="center"
            gutterSize="xs"
            responsive={false}
            wrap={false}
            data-test-subj="workflowExecutionListExecutedByCell"
            css={css`
              min-width: 0;
              width: 100%;
            `}
          >
            <EuiFlexItem grow={false}>
              <UserAvatar
                user={profile?.user ?? { username: displayName }}
                avatar={profile?.data?.avatar}
                size="s"
              />
            </EuiFlexItem>
            <EuiFlexItem
              grow={true}
              css={css`
                /* flex-basis 0 forces a definite width so middle-truncate can measure. */
                flex-basis: 0 !important;
                min-width: 0;
                overflow: hidden;
              `}
            >
              <EuiToolTip content={displayName} position="top" display="block">
                <EuiText
                  size="xs"
                  color="subdued"
                  tabIndex={0}
                  css={css`
                    min-width: 0;
                    line-height: 1.2;
                  `}
                >
                  <EuiTextTruncate text={displayName} truncation="middle" />
                </EuiText>
              </EuiToolTip>
            </EuiFlexItem>
          </EuiFlexGroup>
        );
      },
    },
  ];
};
