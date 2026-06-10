/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiBadge,
  EuiBadgeGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiPopover,
  EuiPopoverTitle,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useState } from 'react';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import { i18n } from '@kbn/i18n';
import { type EsWorkflowExecution, ExecutionStatus, isTerminalStatus } from '@kbn/workflows';
import { formatExecutionTriggerLabel } from './format_execution_table_values';
import { formatDuration } from '../../shared/lib/format_duration';
import {
  FormattedRelativeEnhanced,
  getExecutionStatusIcon,
  ManagedWorkflowBadge,
  useGetFormattedDateTime,
} from '../../shared/ui';

const MAX_VISIBLE_TAGS = 2;

const tagsRowStyle = css`
  flex-wrap: nowrap;
  overflow: hidden;
`;

const visibleTagStyle = css`
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const overflowPopoverStyle = css`
  max-height: 200px;
  max-width: 320px;
  overflow: auto;
`;

export const getWorkflowExecutionSource = (row: DataTableRecord): EsWorkflowExecution | undefined =>
  row.raw._source as EsWorkflowExecution | undefined;

export const getWorkflowExecutionId = (row: DataTableRecord): string | undefined => {
  const { id } = row.flattened;
  if (typeof id === 'string') {
    return id;
  }

  return getWorkflowExecutionSource(row)?.id;
};

export const enrichWorkflowExecutionRowFlattenedValues = (
  row: DataTableRecord
): DataTableRecord => {
  const execution = getWorkflowExecutionSource(row);

  if (!execution) {
    return row;
  }

  const flattened = { ...row.flattened };

  if (execution.workflowId) {
    flattened.workflow = execution.workflowId;
  }

  const triggerLabel = formatExecutionTriggerLabel(execution.triggeredBy);
  if (triggerLabel) {
    flattened.triggers = triggerLabel;
  }

  return {
    ...row,
    flattened,
  };
};

const workflowLinkCss = css`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
  max-width: 100%;
`;

export const WorkflowExecutionWorkflowCell = ({
  row,
  onOpen,
}: {
  row: DataTableRecord;
  onOpen: (row: DataTableRecord) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const execution = getWorkflowExecutionSource(row);
  const name = execution?.workflowDefinition?.name ?? execution?.workflowId;

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      onOpen(row);
    },
    [onOpen, row]
  );

  if (!name) {
    return null;
  }

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="s"
      responsive={false}
      wrap={false}
      data-test-subj="workflowExecutionWorkflowCell"
    >
      {execution?.status ? (
        <EuiFlexItem grow={false}>{getExecutionStatusIcon(euiTheme, execution.status)}</EuiFlexItem>
      ) : null}
      <EuiFlexItem
        grow={false}
        css={css`
          min-width: 0;
          overflow: hidden;
        `}
      >
        <EuiLink
          onClick={handleClick}
          data-test-subj="workflowExecutionWorkflowLink"
          css={workflowLinkCss}
          title={name}
          aria-label={name}
          href="#"
        >
          {name}
        </EuiLink>
      </EuiFlexItem>
      {execution?.status === ExecutionStatus.WAITING_FOR_INPUT ? (
        <EuiFlexItem grow={false}>
          <EuiBadge color="warning" data-test-subj="workflowExecutionActionRequiredBadge">
            {i18n.translate('workflowsManagement.executionListItem.actionRequiredBadge', {
              defaultMessage: 'Action is required',
            })}
          </EuiBadge>
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};

export const WorkflowExecutionTagsCell = ({ row }: { row: DataTableRecord }) => {
  const execution = getWorkflowExecutionSource(row);
  const tags = execution?.workflowDefinition?.tags;
  const isManaged = execution?.managed === true;

  return <WorkflowExecutionTagsContent tags={tags} isManaged={isManaged} />;
};

const WorkflowExecutionTagsContent = ({
  tags,
  isManaged,
}: {
  tags: readonly string[] | undefined;
  isManaged: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const close = useCallback(() => setIsOpen(false), []);

  if (!isManaged && (!tags || tags.length === 0)) {
    return null;
  }

  const workflowTags = tags ?? [];
  const visibleWorkflowTags = workflowTags.slice(
    0,
    isManaged ? MAX_VISIBLE_TAGS - 1 : MAX_VISIBLE_TAGS
  );
  const hidden = workflowTags.slice(visibleWorkflowTags.length);

  return (
    <EuiFlexGroup
      alignItems="center"
      gutterSize="xs"
      responsive={false}
      css={tagsRowStyle}
      data-test-subj="workflowExecutionTags"
    >
      {isManaged ? (
        <EuiFlexItem grow={false} css={visibleTagStyle}>
          <ManagedWorkflowBadge />
        </EuiFlexItem>
      ) : null}
      {visibleWorkflowTags.map((tag) => (
        <EuiFlexItem key={tag} grow={false} css={visibleTagStyle}>
          <EuiBadge color="hollow" title={tag}>
            {tag}
          </EuiBadge>
        </EuiFlexItem>
      ))}
      {hidden.length > 0 && (
        <EuiFlexItem grow={false}>
          <EuiPopover
            ownFocus
            isOpen={isOpen}
            closePopover={close}
            aria-label={i18n.translate('workflowsManagement.executionsPage.tags.popoverTitle', {
              defaultMessage: 'Tags',
            })}
            button={
              <EuiBadge
                color="hollow"
                onClick={toggle}
                onClickAriaLabel={i18n.translate(
                  'workflowsManagement.executionsPage.tags.moreAriaLabel',
                  {
                    defaultMessage: 'View more tags',
                  }
                )}
                data-test-subj="workflowExecutionTagsOverflowBadge"
              >
                {`+${hidden.length}`}
              </EuiBadge>
            }
          >
            <EuiPopoverTitle>
              {i18n.translate('workflowsManagement.executionsPage.tags.popoverTitle', {
                defaultMessage: 'Tags',
              })}
            </EuiPopoverTitle>
            <EuiBadgeGroup gutterSize="xs" css={overflowPopoverStyle}>
              {hidden.map((tag) => (
                <EuiBadge key={tag} color="hollow">
                  {tag}
                </EuiBadge>
              ))}
            </EuiBadgeGroup>
          </EuiPopover>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

export const WorkflowExecutionTriggersCell = ({ row }: { row: DataTableRecord }) => {
  const execution = getWorkflowExecutionSource(row);
  const label = formatExecutionTriggerLabel(execution?.triggeredBy);

  if (!label) {
    return null;
  }

  return <span data-test-subj="workflowExecutionTriggerCell">{label}</span>;
};

export const WorkflowExecutionStartedAtCell = ({ row }: { row: DataTableRecord }) => {
  const getFormattedDateTime = useGetFormattedDateTime();
  const execution = getWorkflowExecutionSource(row);
  const startedAt =
    execution?.startedAt ?? (row.flattened.startedAt as string | number | undefined);

  if (startedAt == null) {
    return null;
  }

  const startedAtDate = new Date(startedAt);
  if (!Number.isFinite(startedAtDate.getTime())) {
    return null;
  }

  const formattedDate = getFormattedDateTime(startedAtDate);

  return (
    <EuiToolTip position="left" content={formattedDate}>
      <span tabIndex={0} data-test-subj="workflowExecutionStartedAtCell">
        <FormattedRelativeEnhanced value={startedAtDate} />
      </span>
    </EuiToolTip>
  );
};

export const WorkflowExecutionDurationCell = ({ row }: { row: DataTableRecord }) => {
  const execution = getWorkflowExecutionSource(row);
  const duration = row.flattened.duration;

  if (duration != null && duration !== '') {
    const durationMs = typeof duration === 'number' ? duration : Number(duration);

    if (!Number.isNaN(durationMs)) {
      return (
        <span data-test-subj="workflowExecutionDurationCell">{formatDuration(durationMs)}</span>
      );
    }
  }

  if (execution?.status && !isTerminalStatus(execution.status)) {
    return (
      <EuiLoadingSpinner
        size="m"
        data-test-subj="workflowExecutionDurationInProgress"
        aria-label={i18n.translate('workflowsManagement.executionsPage.duration.inProgress', {
          defaultMessage: 'In progress',
        })}
      />
    );
  }

  return null;
};
