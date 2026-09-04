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
  EuiTextTruncate,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import React, { useCallback, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  ExecutionStatus,
  isTerminalStatus,
  type WorkflowExecutionListItemDto,
} from '@kbn/workflows';
import { formatExecutionTriggerLabel } from './format_execution_table_values';
import { formatDuration } from '../../shared/lib/format_duration';
import { FormattedRelativeEnhanced } from '../../shared/ui/formatted_relative_enhanced/formatted_relative_enhanced';
import { ManagedWorkflowBadge } from '../../shared/ui/managed_workflow_badge';
import { getExecutionStatusIcon } from '../../shared/ui/status_badge';
import { useGetFormattedDateTime } from '../../shared/ui/use_formatted_date';

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

const workflowNameFlexItemCss = css`
  min-width: 0;
  overflow: hidden;
`;

const workflowLinkCss = css`
  display: block;
  width: 100%;
  min-width: 0;
`;

const durationCellCss = css`
  font-variant-numeric: tabular-nums;
  width: 100%;
  text-align: right;
`;

export const getWorkflowExecutionActionContextFromDto = (
  execution: WorkflowExecutionListItemDto
) => ({
  executionId: execution.id,
  workflowId: execution.workflowId,
  context: execution.context,
});

export const WorkflowExecutionWorkflowCell = ({
  execution,
  onOpen,
}: {
  execution: WorkflowExecutionListItemDto;
  onOpen: (execution: WorkflowExecutionListItemDto) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const name = execution.workflowName ?? execution.workflowId;

  const handleClick = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      onOpen(execution);
    },
    [execution, onOpen]
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
      {execution.status ? (
        <EuiFlexItem grow={false}>{getExecutionStatusIcon(euiTheme, execution.status)}</EuiFlexItem>
      ) : null}
      <EuiFlexItem grow css={workflowNameFlexItemCss}>
        <EuiLink
          onClick={handleClick}
          data-test-subj="workflowExecutionWorkflowLink"
          css={workflowLinkCss}
          aria-label={name}
          href="#"
        >
          <EuiTextTruncate
            text={name}
            truncation="middle"
            data-test-subj="executionsTableWorkflowName"
          >
            {(truncatedText) => {
              const content = <span>{truncatedText}</span>;
              return truncatedText !== name ? (
                <EuiToolTip content={name} anchorProps={{ style: { width: '100%' } }}>
                  {content}
                </EuiToolTip>
              ) : (
                content
              );
            }}
          </EuiTextTruncate>
        </EuiLink>
      </EuiFlexItem>
      {execution.status === ExecutionStatus.WAITING_FOR_INPUT ? (
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

export const WorkflowExecutionTagsCell = ({
  execution,
}: {
  execution: WorkflowExecutionListItemDto;
}) => {
  return (
    <WorkflowExecutionTagsContent tags={execution.tags} isManaged={execution.managed === true} />
  );
};

const TruncatedTagBadge = ({ tag }: { tag: string }) => (
  <EuiToolTip content={tag}>
    <EuiBadge color="hollow" css={visibleTagStyle} title={tag} tabIndex={0}>
      {tag}
    </EuiBadge>
  </EuiToolTip>
);

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
  const hiddenCount = workflowTags.length - visibleWorkflowTags.length;

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
        <EuiFlexItem key={tag} grow={false}>
          <TruncatedTagBadge tag={tag} />
        </EuiFlexItem>
      ))}
      {hiddenCount > 0 && (
        <EuiFlexItem grow={false}>
          <EuiPopover
            ownFocus
            isOpen={isOpen}
            closePopover={close}
            anchorPosition="downLeft"
            panelPaddingSize="s"
            aria-label={i18n.translate(
              'workflowsManagement.executionsPage.table.tagsPopoverTitle',
              {
                defaultMessage: 'All tags',
              }
            )}
            button={
              <EuiBadge
                color="hollow"
                onClick={toggle}
                onClickAriaLabel={i18n.translate(
                  'workflowsManagement.executionsPage.table.showAllTagsAriaLabel',
                  {
                    defaultMessage: 'Show all {count} tags',
                    values: { count: workflowTags.length },
                  }
                )}
                data-test-subj="executionsTableTagsOverflow"
              >
                {`+${hiddenCount}`}
              </EuiBadge>
            }
          >
            <EuiPopoverTitle>
              {i18n.translate('workflowsManagement.executionsPage.table.tagsPopoverTitle', {
                defaultMessage: 'All tags',
              })}
            </EuiPopoverTitle>
            <EuiBadgeGroup gutterSize="xs" css={overflowPopoverStyle}>
              {workflowTags.map((tag) => (
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

export const WorkflowExecutionTriggersCell = ({
  execution,
}: {
  execution: WorkflowExecutionListItemDto;
}) => {
  const label = formatExecutionTriggerLabel(execution.triggeredBy);

  if (!label) {
    return null;
  }

  return <span data-test-subj="workflowExecutionTriggerCell">{label}</span>;
};

export const WorkflowExecutionStartedAtCell = ({
  execution,
}: {
  execution: WorkflowExecutionListItemDto;
}) => {
  const getFormattedDateTime = useGetFormattedDateTime();
  const startedAt = execution.startedAt;

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

export const WorkflowExecutionDurationCell = ({
  execution,
}: {
  execution: WorkflowExecutionListItemDto;
}) => {
  const duration = execution.duration;

  if (duration != null) {
    return (
      <span data-test-subj="workflowExecutionDurationCell" css={durationCellCss}>
        {formatDuration(duration)}
      </span>
    );
  }

  if (execution.status && !isTerminalStatus(execution.status)) {
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
