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
  EuiBasicTable,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiSwitch,
  EuiText,
  EuiToolTip,
} from '@elastic/eui';
import type { CriteriaWithPagination } from '@elastic/eui/src/components/basic_table/basic_table';
import { i18n } from '@kbn/i18n';
import { FormattedRelative } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { WorkflowListItemDto } from '@kbn/workflows';
import React, { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { WorkflowsEmptyState } from '../../../components';
import { useWorkflowActions } from '../../../entities/workflows/model/use_workflow_actions';
import { useWorkflows } from '../../../entities/workflows/model/use_workflows';
import { shouldShowWorkflowsEmptyState } from '../../../shared/utils/workflow_utils';
import type { WorkflowsSearchParams } from '../../../types';
import { WORKFLOWS_TABLE_PAGE_SIZE_OPTIONS } from '../constants';
import { StatusBadge, WorkflowStatus, getRunWorkflowTooltipContent } from '../../../shared/ui';
import { WorkflowExecuteModal } from '../../run_workflow/ui/workflow_execute_modal';
import { WorkflowsTriggersList } from '../../../widgets/worflows_triggers_list/worflows_triggers_list';

interface WorkflowListProps {
  search: WorkflowsSearchParams;
  setSearch: (search: WorkflowsSearchParams) => void;
  onCreateWorkflow?: () => void;
}

export function WorkflowList({ search, setSearch, onCreateWorkflow }: WorkflowListProps) {
  const { application, notifications } = useKibana().services;
  const { data: workflows, isLoading: isLoadingWorkflows, error } = useWorkflows(search);
  const { deleteWorkflows, runWorkflow, cloneWorkflow, updateWorkflow } = useWorkflowActions();

  const [selectedItems, setSelectedItems] = useState<WorkflowListItemDto[]>([]);
  const [executeWorkflow, setExecuteWorkflow] = useState<WorkflowListItemDto | null>(null);

  const canCreateWorkflow = application?.capabilities.workflowsManagement.createWorkflow;
  const canExecuteWorkflow = application?.capabilities.workflowsManagement.executeWorkflow;
  const canUpdateWorkflow = application?.capabilities.workflowsManagement.updateWorkflow;
  const canDeleteWorkflow = application?.capabilities.workflowsManagement.deleteWorkflow;

  const deleteSelectedWorkflows = () => {
    if (selectedItems.length === 0) {
      return;
    }
    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedItems.length} workflows?`
    );
    if (!confirmed) {
      return;
    }
    deleteWorkflows.mutate({ ids: selectedItems.map((item) => item.id) });
    setSelectedItems([]);
  };

  const handleRunWorkflow = useCallback(
    (id: string, event: Record<string, any>) => {
      runWorkflow.mutate(
        { id, inputs: event },
        {
          onSuccess: ({ workflowExecutionId }) => {
            notifications?.toasts.addSuccess('Workflow run started', {
              toastLifeTimeMs: 3000,
            });
            application!.navigateToUrl(
              application!.getUrlForApp('workflows', {
                path: `/${id}?tab=executions&executionId=${workflowExecutionId}`,
              })
            );
          },
          onError: (err: unknown) => {
            notifications?.toasts.addError(err as Error, {
              toastLifeTimeMs: 3000,
              title: 'Failed to run workflow',
            });
          },
        }
      );
    },
    [application, notifications, runWorkflow]
  );

  const handleDeleteWorkflow = useCallback(
    (item: WorkflowListItemDto) => {
      const confirmed = window.confirm(`Are you sure you want to delete ${item.name}?`);
      if (!confirmed) {
        return;
      }
      deleteWorkflows.mutate({ ids: [item.id] });
    },
    [deleteWorkflows]
  );

  const handleCloneWorkflow = useCallback(
    (item: WorkflowListItemDto) => {
      cloneWorkflow.mutate(
        { id: item.id },
        {
          onError: (err: unknown) => {
            notifications?.toasts.addError(err as Error, {
              toastLifeTimeMs: 3000,
              title: 'Failed to clone workflow',
            });
          },
        }
      );
    },
    [cloneWorkflow, notifications?.toasts]
  );

  const handleToggleWorkflow = useCallback(
    (item: WorkflowListItemDto) => {
      updateWorkflow.mutate(
        {
          id: item.id,
          workflow: {
            enabled: !item.enabled,
          },
        },
        {
          onError: (err: unknown) => {
            notifications?.toasts.addError(err as Error, {
              toastLifeTimeMs: 3000,
              title: 'Failed to update workflow',
            });
          },
        }
      );
    },
    [notifications?.toasts, updateWorkflow]
  );

  const columns = useMemo<Array<EuiBasicTableColumn<WorkflowListItemDto>>>(
    () => [
      {
        field: 'name',
        name: 'Name',
        dataType: 'string',
        render: (name: string, item) => (
          <EuiFlexGroup direction="column" gutterSize="xs">
            <EuiFlexItem>
              <EuiLink>
                <Link to={`/${item.id}`}>{name}</Link>
              </EuiLink>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiText size="s" color="subdued">
                {item.description}
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        ),
      },
      {
        field: 'triggers',
        name: 'Triggers',
        render: (value: any, item: WorkflowListItemDto) =>
          item.definition?.triggers ? (
            <WorkflowsTriggersList triggers={item.definition.triggers} />
          ) : (
            <EuiText size="s">No triggers</EuiText>
          ),
      },
      {
        name: 'Last run',
        field: 'runHistory',
        render: (value, item) => {
          if (item.history.length === 0) return;
          const lastRun = item.history[0];
          return (
            <EuiText size="s">
              <FormattedRelative value={lastRun.finishedAt} />
            </EuiText>
          );
        },
      },
      {
        name: 'Last run status',
        field: 'runHistory',
        render: (value, item) => {
          if (item.history.length === 0) {
            return;
          }
          return <StatusBadge status={item.history[0].status} />;
        },
      },
      {
        name: 'Valid',
        field: 'valid',
        render: (value: boolean) => {
          return <WorkflowStatus valid={value} />;
        },
      },
      {
        name: 'Enabled',
        field: 'enabled',
        render: (value, item) => {
          return (
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
                disabled={!canUpdateWorkflow || !item.valid}
                checked={item.enabled}
                onChange={() => handleToggleWorkflow(item)}
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
          );
        },
      },
      {
        name: 'Actions',
        actions: [
          {
            isPrimary: true,
            enabled: (item) => !!canExecuteWorkflow && item.enabled && item.valid,
            type: 'icon',
            color: 'primary',
            name: i18n.translate('workflows.workflowList.run', {
              defaultMessage: 'Run',
            }),
            icon: 'play',
            description: (item: WorkflowListItemDto) =>
              getRunWorkflowTooltipContent(item.valid, !!canExecuteWorkflow, item.enabled) ??
              i18n.translate('workflows.workflowList.run', {
                defaultMessage: 'Run',
              }),
            onClick: (item: WorkflowListItemDto) => {
              let needInput: boolean | undefined = false;
              if (item.definition?.triggers) {
                needInput =
                  item.definition.triggers.some((trigger) => trigger.type === 'alert') ||
                  (item.definition.triggers.some((trigger) => trigger.type === 'manual') &&
                    item.definition.inputs &&
                    Object.keys(item.definition.inputs).length > 0);
              }
              if (needInput) {
                setExecuteWorkflow(item);
              } else {
                handleRunWorkflow(item.id, {});
              }
            },
          },
          {
            enabled: () => !!canUpdateWorkflow,
            type: 'icon',
            color: 'primary',
            name: i18n.translate('workflows.workflowList.edit', {
              defaultMessage: 'Edit',
            }),
            icon: 'pencil',
            description: i18n.translate('workflows.workflowList.edit', {
              defaultMessage: 'Edit workflow',
            }),
            href: (item) => application!.getUrlForApp('workflows', { path: `/${item.id}` }),
          },
          {
            enabled: () => !!canCreateWorkflow,
            type: 'icon',
            color: 'primary',
            name: i18n.translate('workflows.workflowList.clone', {
              defaultMessage: 'Clone',
            }),
            icon: 'copy',
            description: i18n.translate('workflows.workflowList.clone', {
              defaultMessage: 'Clone workflow',
            }),
            onClick: (item: WorkflowListItemDto) => {
              handleCloneWorkflow(item);
            },
          },
          {
            enabled: () => false,
            type: 'icon',
            color: 'primary',
            name: i18n.translate('workflows.workflowList.export', {
              defaultMessage: 'Export',
            }),
            icon: 'export',
            description: i18n.translate('workflows.workflowList.export', {
              defaultMessage: 'Export workflow',
            }),
          },
          {
            enabled: () => !!canDeleteWorkflow,
            type: 'icon',
            color: 'danger',
            name: i18n.translate('workflows.workflowList.delete', {
              defaultMessage: 'Delete',
            }),
            icon: 'trash',
            description: i18n.translate('workflows.workflowList.delete', {
              defaultMessage: 'Delete workflow',
            }),
            onClick: (item: WorkflowListItemDto) => handleDeleteWorkflow(item),
          },
        ],
      },
    ],
    [
      application,
      canCreateWorkflow,
      canDeleteWorkflow,
      canExecuteWorkflow,
      canUpdateWorkflow,
      handleCloneWorkflow,
      handleDeleteWorkflow,
      handleRunWorkflow,
      setExecuteWorkflow,
      handleToggleWorkflow,
    ]
  );

  if (isLoadingWorkflows) {
    return (
      <EuiFlexGroup justifyContent={'center'} alignItems={'center'}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText>Loading workflows...</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (error) {
    return <EuiText>Error loading workflows</EuiText>;
  }

  // Show empty state if no workflows exist and no filters are applied
  if (shouldShowWorkflowsEmptyState(workflows, search)) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: '60vh' }}>
        <EuiFlexItem grow={false}>
          <WorkflowsEmptyState
            onCreateWorkflow={onCreateWorkflow}
            canCreateWorkflow={!!canCreateWorkflow}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  const showStart = (search.page - 1) * search.limit + 1;
  let showEnd = search.page * search.limit;
  if (showEnd > (workflows!._pagination.total || 0)) {
    showEnd = workflows!._pagination.total;
  }

  return (
    <>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        <EuiFlexItem grow={5}>
          <EuiText size="s">
            Showing
            <b>
              {' '}
              {showStart}-{showEnd}{' '}
            </b>
            of {workflows?._pagination.total} workflows
          </EuiText>
        </EuiFlexItem>
        {canDeleteWorkflow && (
          <EuiFlexItem>
            <EuiButton
              color="danger"
              iconType="trash"
              onClick={deleteSelectedWorkflows}
              isDisabled={selectedItems.length === 0}
            >
              Delete {selectedItems.length || 'selected'} workflows
            </EuiButton>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
      <EuiSpacer />
      <EuiBasicTable
        columns={columns}
        items={workflows?.results ?? []}
        itemId="id"
        responsiveBreakpoint={false}
        tableLayout={'auto'}
        onChange={({ page: { index: pageIndex, size } }: CriteriaWithPagination<any>) =>
          setSearch({ ...search, page: pageIndex + 1, limit: size })
        }
        selection={{
          onSelectionChange: setSelectedItems,
          selectable: () => true,
          initialSelected: selectedItems,
        }}
        pagination={{
          pageSize: search.limit,
          pageSizeOptions: WORKFLOWS_TABLE_PAGE_SIZE_OPTIONS,
          totalItemCount: workflows!._pagination.total,
          pageIndex: search.page - 1,
        }}
      />
      {executeWorkflow && (
        <WorkflowExecuteModal
          workflow={executeWorkflow}
          onClose={() => setExecuteWorkflow(null)}
          onSubmit={(event) => handleRunWorkflow(executeWorkflow.id, event)}
        />
      )}
    </>
  );
}
