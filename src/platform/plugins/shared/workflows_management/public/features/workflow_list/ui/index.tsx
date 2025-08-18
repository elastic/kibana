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
  EuiIcon,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiSwitch,
  EuiText,
} from '@elastic/eui';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { WorkflowListItemDto } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import React, { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FormattedRelative } from '@kbn/i18n-react';
import { capitalize } from 'lodash';
import type { CriteriaWithPagination } from '@elastic/eui/src/components/basic_table/basic_table';
import { useWorkflowActions } from '../../../entities/workflows/model/use_workflow_actions';
import { useWorkflows } from '../../../entities/workflows/model/use_workflows';
import type { WorkflowsSearchParams } from '../../../types';
import { WORKFLOWS_TABLE_PAGE_SIZE_OPTIONS } from '../constants';

const EXECUTION_STATUS_MAP = {
  [ExecutionStatus.COMPLETED]: {
    icon: 'checkInCircleFilled',
    color: 'success',
  },
  [ExecutionStatus.FAILED]: {
    icon: 'errorFilled',
    color: 'danger',
  },
  [ExecutionStatus.CANCELLED]: {
    icon: 'crossInCircle',
    color: 'disabled',
  },
  [ExecutionStatus.RUNNING]: {
    icon: 'play',
    color: 'primary',
  },
  [ExecutionStatus.PENDING]: {
    icon: 'clock',
    color: 'subdued',
  },
  [ExecutionStatus.SKIPPED]: {
    icon: 'checkInCircleFilled',
    color: 'grey',
  },
  [ExecutionStatus.WAITING_FOR_INPUT]: {
    icon: 'inputOutput',
    color: 'warning',
  },
};

interface WorkflowListProps {
  search: WorkflowsSearchParams;
  setSearch: (search: WorkflowsSearchParams) => void;
}

export function WorkflowList({ search, setSearch }: WorkflowListProps) {
  const { application, notifications } = useKibana().services;
  const { data: workflows, isLoading: isLoadingWorkflows, error } = useWorkflows(search);
  const { deleteWorkflows, runWorkflow, cloneWorkflow, updateWorkflow } = useWorkflowActions();

  const [selectedItems, setSelectedItems] = useState<WorkflowListItemDto[]>([]);

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
    (item: WorkflowListItemDto) => {
      runWorkflow.mutate(
        { id: item.id, inputs: {} },
        {
          onSuccess: () => {
            notifications?.toasts.addSuccess('Workflow run started', {
              toastLifeTimeMs: 3000,
            });
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
    [notifications, runWorkflow]
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
            ...item,
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
          if (item.history.length === 0) return;
          const lastRun = item.history[0];
          const { icon, color } = EXECUTION_STATUS_MAP[lastRun.status];

          return (
            <EuiText size="s">
              <EuiIcon type={icon} color={color} /> {capitalize(lastRun.status)}
            </EuiText>
          );
        },
      },
      {
        name: 'Enabled',
        field: 'enabled',
        render: (value, item) => {
          return (
            <EuiSwitch
              disabled={!canUpdateWorkflow}
              checked={item.enabled}
              onChange={() => handleToggleWorkflow(item)}
              label={'Enabled'}
            />
          );
        },
      },
      {
        name: 'Actions',
        actions: [
          {
            isPrimary: true,
            enabled: (item) => !!canExecuteWorkflow && item.enabled,
            type: 'icon',
            color: 'primary',
            name: 'Run',
            icon: 'play',
            description: 'Run workflow',
            onClick: (item: WorkflowListItemDto) => handleRunWorkflow(item),
          },
          {
            enabled: () => !!canUpdateWorkflow,
            type: 'icon',
            color: 'primary',
            name: 'Edit',
            icon: 'pencil',
            description: 'Edit workflow',
            href: (item) => application!.getUrlForApp('workflows', { path: `/${item.id}` }),
          },
          {
            enabled: () => !!canCreateWorkflow,
            type: 'icon',
            color: 'primary',
            name: 'Clone',
            icon: 'copy',
            description: 'Clone workflow',
            onClick: (item: WorkflowListItemDto) => {
              handleCloneWorkflow(item);
            },
          },
          {
            enabled: () => false,
            type: 'icon',
            color: 'primary',
            name: 'Export',
            icon: 'export',
            description: 'Export',
          },
          {
            enabled: () => !!canDeleteWorkflow,
            type: 'icon',
            color: 'danger',
            name: 'Delete',
            icon: 'trash',
            description: 'Delete',
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
    </>
  );
}
