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
  EuiConfirmModal,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiSwitch,
  EuiText,
  EuiToolTip,
  useGeneratedHtmlId,
} from '@elastic/eui';
import type { CriteriaWithPagination } from '@elastic/eui/src/components/basic_table/basic_table';
import { css } from '@emotion/react';
import React, { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { WorkflowListItemDto, WorkflowsSearchParams } from '@kbn/workflows';
import { useWorkflows } from '@kbn/workflows-ui';
import { WorkflowsUtilityBar } from './workflows_utility_bar';
import { WorkflowsEmptyState } from '../../../components';
import { useWorkflowActions } from '../../../entities/workflows/model/use_workflow_actions';
import { useKibana } from '../../../hooks/use_kibana';
import { useTelemetry } from '../../../hooks/use_telemetry';
import { getRunTooltipContent, StatusBadge, WorkflowStatus } from '../../../shared/ui';
import { NextExecutionTime } from '../../../shared/ui/next_execution_time';
import { shouldShowWorkflowsEmptyState } from '../../../shared/utils/workflow_utils';
import { WorkflowsTriggersList } from '../../../widgets/worflows_triggers_list/worflows_triggers_list';
import { WorkflowTags } from '../../../widgets/workflow_tags/workflow_tags';
import { WorkflowExecuteModal } from '../../run_workflow/ui/workflow_execute_modal';
import { WORKFLOWS_TABLE_PAGE_SIZE_OPTIONS } from '../constants';

interface WorkflowListProps {
  search: WorkflowsSearchParams;
  setSearch: (search: WorkflowsSearchParams) => void;
  onCreateWorkflow?: () => void;
}

export function WorkflowList({ search, setSearch, onCreateWorkflow }: WorkflowListProps) {
  const { application, notifications } = useKibana().services;
  const { data: workflows, isLoading: isLoadingWorkflows, error, refetch } = useWorkflows(search);
  const { deleteWorkflows, runWorkflow, cloneWorkflow, updateWorkflow } = useWorkflowActions();
  const [workflowToDelete, setWorkflowToDelete] = useState<WorkflowListItemDto | null>(null);
  const modalTitleId = useGeneratedHtmlId();
  const telemetry = useTelemetry();

  // Report list viewed telemetry when workflows are loaded
  React.useEffect(() => {
    if (!isLoadingWorkflows && workflows) {
      telemetry.reportWorkflowListViewed({
        workflowCount: workflows.results.length,
        pageNumber: search.page || 1,
        search: { ...search },
      });
    }
  }, [isLoadingWorkflows, workflows, search, telemetry]);

  const [selectedItems, setSelectedItems] = useState<WorkflowListItemDto[]>([]);
  const [executeWorkflow, setExecuteWorkflow] = useState<WorkflowListItemDto | null>(null);

  const canCreateWorkflow = application.capabilities.workflowsManagement.createWorkflow;
  const canExecuteWorkflow = application.capabilities.workflowsManagement.executeWorkflow;
  const canUpdateWorkflow = application.capabilities.workflowsManagement.updateWorkflow;
  const canDeleteWorkflow = application.capabilities.workflowsManagement.deleteWorkflow;

  const deselectWorkflows = useCallback(() => {
    setSelectedItems([]);
  }, []);

  const onRefresh = useCallback(async () => {
    const result = await refetch();
    // Update selected items with fresh data after refetch
    if (result.data?.results && selectedItems.length > 0) {
      const selectedIds = selectedItems.map((item) => item.id);
      const updatedSelectedItems = result.data.results.filter((workflow) =>
        selectedIds.includes(workflow.id)
      );
      setSelectedItems(updatedSelectedItems);
    }
  }, [refetch, selectedItems]);

  const handleRunWorkflow = useCallback(
    (id: string, event: Record<string, unknown>, triggerTab?: 'manual' | 'alert' | 'index') => {
      runWorkflow.mutate(
        { id, inputs: event, triggerTab },
        {
          onSuccess: ({ workflowExecutionId }) => {
            notifications?.toasts.addSuccess('Workflow run started', {
              toastLifeTimeMs: 3000,
            });
            application.navigateToUrl(
              application.getUrlForApp('workflows', {
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
    (item: WorkflowListItemDto) => setWorkflowToDelete(item),
    [setWorkflowToDelete]
  );

  const handleConfirmDelete = useCallback(() => {
    if (workflowToDelete) {
      deleteWorkflows.mutate({ ids: [workflowToDelete.id] });
      setWorkflowToDelete(null);
    }
  }, [deleteWorkflows, workflowToDelete]);

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
          <div
            css={css`
              max-width: 100%;
              overflow: hidden;
            `}
          >
            <EuiFlexGroup direction="column" gutterSize="xs">
              <EuiFlexItem>
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
        field: 'tags',
        name: 'Tags',
        width: '15%',
        render: (value: unknown, workflow: WorkflowListItemDto) => {
          return <WorkflowTags tags={workflow.definition?.tags} />;
        },
      },
      {
        field: 'triggers',
        name: 'Trigger',
        width: '12%',
        render: (value: unknown, item: WorkflowListItemDto) => (
          <NextExecutionTime triggers={item.definition?.triggers ?? []} history={item.history}>
            <WorkflowsTriggersList triggers={item.definition?.triggers ?? []} />
          </NextExecutionTime>
        ),
      },
      {
        name: 'Last run',
        field: 'runHistory',
        width: '10%',
        render: (value, item) => {
          if (!item.history || item.history.length === 0) return;
          const lastRun = item.history[0];
          return (
            <StatusBadge status={lastRun.status} date={lastRun.finishedAt || lastRun.startedAt} />
          );
        },
      },
      {
        name: 'Enabled',
        field: 'enabled',
        width: '70px',
        render: (value, item) => {
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
              </EuiFlexItem>
              {/* TODO: right now it's only invalid but in the future we might need to add other statuses */}
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
            enabled: (item) => !!canExecuteWorkflow && item.enabled && item.valid,
            type: 'icon',
            color: 'text',
            name: i18n.translate('workflows.workflowList.run', {
              defaultMessage: 'Run',
            }),
            'data-test-subj': 'runWorkflowAction',
            icon: 'play',
            description: (item: WorkflowListItemDto) =>
              getRunTooltipContent({
                isValid: item.valid,
                canRunWorkflow: !!canExecuteWorkflow,
                isEnabled: item.enabled,
              }) ??
              i18n.translate('workflows.workflowList.run', {
                defaultMessage: 'Run',
              }),
            onClick: (item: WorkflowListItemDto) => {
              setExecuteWorkflow(item);
            },
          },
          {
            enabled: () => !!canUpdateWorkflow,
            type: 'icon',
            color: 'text',
            isPrimary: true,
            name: i18n.translate('workflows.workflowList.edit', {
              defaultMessage: 'Edit',
            }),
            'data-test-subj': 'editWorkflowAction',
            icon: 'pencil',
            description: i18n.translate('workflows.workflowList.edit', {
              defaultMessage: 'Edit workflow',
            }),
            href: (item) => application.getUrlForApp('workflows', { path: `/${item.id}` }),
          },
          {
            enabled: () => !!canCreateWorkflow,
            type: 'icon',
            color: 'primary',
            name: i18n.translate('workflows.workflowList.clone', {
              defaultMessage: 'Clone',
            }),
            'data-test-subj': 'cloneWorkflowAction',
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
            'data-test-subj': 'exportWorkflowAction',
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
            'data-test-subj': 'deleteWorkflowAction',
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
      canUpdateWorkflow,
      handleToggleWorkflow,
      canExecuteWorkflow,
      application,
      canCreateWorkflow,
      handleCloneWorkflow,
      canDeleteWorkflow,
      handleDeleteWorkflow,
      setExecuteWorkflow,
    ]
  );

  if (isLoadingWorkflows) {
    return (
      <EuiFlexGroup justifyContent={'center'} alignItems={'center'}>
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText>
            <FormattedMessage
              id="workflows.workflowList.loading"
              defaultMessage="Loading workflows..."
            />
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (error) {
    return (
      <EuiText>
        <FormattedMessage
          id="workflows.workflowList.error"
          defaultMessage="Error loading workflows"
        />
      </EuiText>
    );
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

  const showStart = (search.page - 1) * search.size + 1;
  let showEnd = search.page * search.size;
  if (workflows && showEnd > (workflows.total || 0)) {
    showEnd = workflows.total;
  }

  return (
    <>
      <WorkflowsUtilityBar
        totalWorkflows={workflows?.total || 0}
        selectedWorkflows={selectedItems}
        deselectWorkflows={deselectWorkflows}
        onRefresh={onRefresh}
        showStart={showStart}
        showEnd={showEnd}
      />
      <EuiBasicTable
        data-test-subj="workflowListTable"
        css={css`
          .euiBasicTableAction-showOnHover {
            opacity: 1 !important;
          }
        `}
        rowProps={() => ({
          style: { height: '68px' },
        })}
        columns={columns}
        items={workflows?.results ?? []}
        itemId="id"
        responsiveBreakpoint="xs"
        tableLayout={'fixed'}
        onChange={({
          page: { index: pageIndex, size },
        }: CriteriaWithPagination<WorkflowListItemDto>) =>
          setSearch({ ...search, page: pageIndex + 1, size })
        }
        selection={{
          onSelectionChange: setSelectedItems,
          selectable: () => true,
          selected: selectedItems,
        }}
        pagination={{
          pageSize: search.size,
          pageSizeOptions: WORKFLOWS_TABLE_PAGE_SIZE_OPTIONS,
          totalItemCount: workflows?.total ?? 0,
          pageIndex: search.page - 1,
        }}
      />
      {executeWorkflow?.definition && (
        <WorkflowExecuteModal
          isTestRun={false}
          definition={executeWorkflow.definition}
          workflowId={executeWorkflow.id}
          onClose={() => setExecuteWorkflow(null)}
          onSubmit={(event) => handleRunWorkflow(executeWorkflow.id, event)}
        />
      )}
      {workflowToDelete && (
        <EuiConfirmModal
          title={i18n.translate('workflows.workflowList.deleteModal.title', {
            defaultMessage: `Delete "${workflowToDelete.name}"?`,
            values: { name: workflowToDelete.name },
          })}
          titleProps={{ id: modalTitleId }}
          aria-labelledby={modalTitleId}
          onCancel={() => setWorkflowToDelete(null)}
          onConfirm={handleConfirmDelete}
          cancelButtonText={i18n.translate('workflows.workflowList.deleteModal.cancel', {
            defaultMessage: 'Cancel',
          })}
          confirmButtonText={i18n.translate('workflows.workflowList.deleteModal.confirm', {
            defaultMessage: 'Delete',
          })}
          buttonColor="danger"
          defaultFocusedButton="cancel"
          data-test-subj="workflows-delete-confirmation-modal"
        >
          <p>
            {i18n.translate('workflows.workflowList.deleteModal.message', {
              defaultMessage: `Delete the "${workflowToDelete.name}" workflow? This action cannot be undone.`,
              values: { name: workflowToDelete.name },
            })}
          </p>
        </EuiConfirmModal>
      )}
    </>
  );
}
