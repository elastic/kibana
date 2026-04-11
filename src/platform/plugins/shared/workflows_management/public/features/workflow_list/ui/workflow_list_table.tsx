/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiBadgeGroup,
  EuiBasicTable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiLink,
  EuiPopover,
  EuiPopoverTitle,
  EuiSwitch,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import type { CriteriaWithPagination } from '@elastic/eui/src/components/basic_table/basic_table';
import { css } from '@emotion/react';
import React, { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { WorkflowListItemDto } from '@kbn/workflows';
import { getRunTooltipContent, StatusBadge, WorkflowStatus } from '../../../shared/ui';
import { NextExecutionTime } from '../../../shared/ui/next_execution_time';
import { WorkflowsTriggersList } from '../../../widgets/worflows_triggers_list/worflows_triggers_list';
import { WorkflowsStepTypesList } from '../../../widgets/workflows_step_types_list/workflows_step_types_list';
import { WORKFLOWS_TABLE_PAGE_SIZE_OPTIONS } from '../constants';

export interface WorkflowListTableProps {
  items: WorkflowListItemDto[];
  page: number;
  size: number;
  total: number;
  selectedItems: WorkflowListItemDto[];
  onSelectionChange: (items: WorkflowListItemDto[]) => void;
  onPageChange: (pageIndex: number, pageSize: number) => void;
  onToggleWorkflow: (item: WorkflowListItemDto) => void;
  onDeleteWorkflow: (item: WorkflowListItemDto) => void;
  onCloneWorkflow: (item: WorkflowListItemDto) => void;
  onExportWorkflow: (item: WorkflowListItemDto) => void;
  onRequestRun: (item: WorkflowListItemDto) => void;
  getEditHref: (item: WorkflowListItemDto) => string;
  canCreateWorkflow: boolean;
  canUpdateWorkflow: boolean;
  canDeleteWorkflow: boolean;
  canExecuteWorkflow: boolean;
}

export const WorkflowListTable = ({
  items,
  page,
  size,
  total,
  selectedItems,
  onSelectionChange,
  onPageChange,
  onToggleWorkflow,
  onDeleteWorkflow,
  onCloneWorkflow,
  onExportWorkflow,
  onRequestRun,
  getEditHref,
  canCreateWorkflow,
  canUpdateWorkflow,
  canDeleteWorkflow,
  canExecuteWorkflow,
}: WorkflowListTableProps) => {
  const columns = useMemo<Array<EuiBasicTableColumn<WorkflowListItemDto>>>(
    () => [
      {
        field: 'name',
        name: i18n.translate('workflows.workflowList.column.name', { defaultMessage: 'Name' }),
        dataType: 'string',
        render: (name: string, item) => (
          <div
            css={css`
              max-width: 100%;
              overflow: hidden;
            `}
          >
            <EuiFlexGroup direction="column" gutterSize="xs">
              <EuiFlexItem>
                <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false} wrap={false}>
                  <EuiFlexItem
                    grow={false}
                    css={css`
                      min-width: 0;
                    `}
                  >
                    <EuiLink>
                      <Link
                        to={`/${item.id}`}
                        css={css`
                          white-space: nowrap;
                          overflow: hidden;
                          text-overflow: ellipsis;
                          display: block;
                          max-width: 100%;
                        `}
                        title={name}
                        data-test-subj="workflowNameLink"
                      >
                        {name}
                      </Link>
                    </EuiLink>
                  </EuiFlexItem>
                  <WorkflowTagsBadge tags={item.definition?.tags} />
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiText
                  size="xs"
                  color="subdued"
                  title={item.description}
                  css={css`
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                    max-width: 100%;
                    display: block;
                    width: 100%;
                  `}
                >
                  {item.description || (
                    <FormattedMessage
                      id="workflows.workflowList.noDescription"
                      defaultMessage="No description"
                    />
                  )}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </div>
        ),
      },
      {
        field: 'triggers',
        name: i18n.translate('workflows.workflowList.column.trigger', {
          defaultMessage: 'Trigger',
        }),
        width: '12%',
        render: (value: unknown, item: WorkflowListItemDto) => (
          <NextExecutionTime triggers={item.definition?.triggers ?? []} history={item.history}>
            <WorkflowsTriggersList triggers={item.definition?.triggers ?? []} />
          </NextExecutionTime>
        ),
      },
      {
        field: 'steps',
        name: i18n.translate('workflows.workflowList.column.steps', {
          defaultMessage: 'Steps',
        }),
        width: '12%',
        render: (value: unknown, item: WorkflowListItemDto) => (
          <WorkflowsStepTypesList steps={item.definition?.steps ?? []} />
        ),
      },
      {
        name: i18n.translate('workflows.workflowList.column.lastRun', {
          defaultMessage: 'Last run',
        }),
        field: 'runHistory',
        width: '10%',
        render: (value: unknown, item: WorkflowListItemDto) => {
          if (!item.history || item.history.length === 0) return null;
          const lastRun = item.history[0];
          return (
            <StatusBadge status={lastRun.status} date={lastRun.finishedAt || lastRun.startedAt} />
          );
        },
      },
      {
        name: i18n.translate('workflows.workflowList.column.enabled', {
          defaultMessage: 'Enabled',
        }),
        field: 'enabled',
        width: '70px',
        render: (value: unknown, item: WorkflowListItemDto) => {
          return (
            <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiToolTip
                  content={
                    !item.valid
                      ? i18n.translate('workflows.workflowList.invalid', {
                          defaultMessage: 'Fix errors to enable workflow',
                        })
                      : undefined
                  }
                >
                  <EuiSwitch
                    data-test-subj={`workflowToggleSwitch-${item.id}`}
                    disabled={!canUpdateWorkflow || !item.valid}
                    checked={item.enabled}
                    onChange={() => onToggleWorkflow(item)}
                    label={
                      item.enabled
                        ? i18n.translate('workflows.workflowList.enabled', {
                            defaultMessage: 'Enabled',
                          })
                        : i18n.translate('workflows.workflowList.disabled', {
                            defaultMessage: 'Disabled',
                          })
                    }
                    showLabel={false}
                  />
                </EuiToolTip>
              </EuiFlexItem>
              {!item.valid && (
                <EuiFlexItem grow={false}>
                  <WorkflowStatus valid={item.valid} />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          );
        },
      },
      {
        name: '',
        width: '120px',
        actions: [
          {
            isPrimary: true,
            enabled: (item) => canExecuteWorkflow && item.enabled && item.valid,
            type: 'icon',
            color: 'text',
            name: i18n.translate('workflows.workflowList.run', { defaultMessage: 'Run' }),
            'data-test-subj': 'runWorkflowAction',
            icon: 'play',
            description: (item: WorkflowListItemDto) =>
              getRunTooltipContent({
                isValid: item.valid,
                canRunWorkflow: canExecuteWorkflow,
                isEnabled: item.enabled,
              }) ?? i18n.translate('workflows.workflowList.run', { defaultMessage: 'Run' }),
            onClick: (item: WorkflowListItemDto) => onRequestRun(item),
          },
          {
            enabled: () => canUpdateWorkflow,
            type: 'icon',
            color: 'text',
            isPrimary: true,
            name: i18n.translate('workflows.workflowList.edit', { defaultMessage: 'Edit' }),
            'data-test-subj': 'editWorkflowAction',
            icon: 'pencil',
            description: i18n.translate('workflows.workflowList.edit', {
              defaultMessage: 'Edit workflow',
            }),
            href: (item: WorkflowListItemDto) => getEditHref(item),
          },
          {
            enabled: () => canCreateWorkflow,
            type: 'icon',
            color: 'primary',
            name: i18n.translate('workflows.workflowList.clone', { defaultMessage: 'Clone' }),
            'data-test-subj': 'cloneWorkflowAction',
            icon: 'copy',
            description: i18n.translate('workflows.workflowList.clone', {
              defaultMessage: 'Clone workflow',
            }),
            onClick: (item: WorkflowListItemDto) => onCloneWorkflow(item),
          },
          {
            enabled: (item) => item.definition !== null,
            type: 'icon',
            color: 'primary',
            name: i18n.translate('workflows.workflowList.export', { defaultMessage: 'Export' }),
            'data-test-subj': 'exportWorkflowAction',
            icon: 'export',
            description: i18n.translate('workflows.workflowList.export', {
              defaultMessage: 'Export workflow',
            }),
            onClick: (item: WorkflowListItemDto) => onExportWorkflow(item),
          },
          {
            enabled: () => canDeleteWorkflow,
            type: 'icon',
            color: 'danger',
            name: i18n.translate('workflows.workflowList.delete', { defaultMessage: 'Delete' }),
            'data-test-subj': 'deleteWorkflowAction',
            icon: 'trash',
            description: i18n.translate('workflows.workflowList.delete', {
              defaultMessage: 'Delete workflow',
            }),
            onClick: (item: WorkflowListItemDto) => onDeleteWorkflow(item),
          },
        ],
      },
    ],
    [
      canUpdateWorkflow,
      onToggleWorkflow,
      canExecuteWorkflow,
      getEditHref,
      canCreateWorkflow,
      onCloneWorkflow,
      onExportWorkflow,
      canDeleteWorkflow,
      onDeleteWorkflow,
      onRequestRun,
    ]
  );

  return (
    <EuiBasicTable
      tableCaption={i18n.translate('workflows.workflowList.tableCaption', {
        defaultMessage: 'Workflows',
      })}
      data-test-subj="workflowListTable"
      css={css`
        container-type: inline-size;

        .euiBasicTableAction-showOnHover {
          opacity: 1 !important;
        }
      `}
      rowProps={() => ({
        style: { height: '68px' },
      })}
      columns={columns}
      items={items}
      itemId="id"
      responsiveBreakpoint="xs"
      tableLayout="fixed"
      onChange={({
        page: { index: pageIndex, size: pageSize },
      }: CriteriaWithPagination<WorkflowListItemDto>) => onPageChange(pageIndex, pageSize)}
      selection={{
        onSelectionChange,
        selectable: () => true,
        selected: selectedItems,
      }}
      pagination={{
        pageSize: size,
        pageSizeOptions: WORKFLOWS_TABLE_PAGE_SIZE_OPTIONS,
        totalItemCount: total,
        pageIndex: page - 1,
      }}
    />
  );
};

const WorkflowTagsBadge = ({ tags }: { tags: readonly string[] | undefined }) => {
  const [isOpen, setIsOpen] = useState(false);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const close = useCallback(() => setIsOpen(false), []);

  if (!tags || tags.length === 0) return null;

  return (
    <EuiFlexItem grow={false}>
      <EuiPopover
        ownFocus
        isOpen={isOpen}
        closePopover={close}
        aria-label={i18n.translate('workflows.workflowList.tags.ariaLabel', {
          defaultMessage: 'View tags',
        })}
        button={
          <EuiBadge
            color="hollow"
            onClick={toggle}
            onClickAriaLabel={i18n.translate('workflows.workflowList.tags.ariaLabel', {
              defaultMessage: 'View tags',
            })}
            data-test-subj="workflowTagsBadge"
          >
            <EuiFlexGroup alignItems="center" gutterSize="xs" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiIcon type="tag" size="s" aria-hidden={true} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>{tags.length}</EuiFlexItem>
            </EuiFlexGroup>
          </EuiBadge>
        }
      >
        <EuiPopoverTitle>
          {i18n.translate('workflows.workflowList.tags.popoverTitle', {
            defaultMessage: 'Tags',
          })}
        </EuiPopoverTitle>
        <EuiBadgeGroup
          gutterSize="xs"
          css={css`
            max-height: 200px;
            max-width: 400px;
            overflow: auto;
          `}
        >
          {tags.map((tag) => (
            <EuiBadge key={tag} color="hollow">
              {tag}
            </EuiBadge>
          ))}
        </EuiBadgeGroup>
      </EuiPopover>
    </EuiFlexItem>
  );
};
