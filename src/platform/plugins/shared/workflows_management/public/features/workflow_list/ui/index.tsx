/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BarSeries, Chart, ScaleType, Settings } from '@elastic/charts';
import type { EuiBasicTableColumn } from '@elastic/eui';
import {
  EuiBadge,
  EuiBasicTable,
  EuiButton,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  toSentenceCase,
  useEuiTheme,
} from '@elastic/eui';
import type { Action } from '@elastic/eui/src/components/basic_table/action_types';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { WorkflowListItemDto } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import React, { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useWorkflowActions } from '../../../entities/workflows/model/useWorkflowActions';
import { useWorkflows } from '../../../entities/workflows/model/useWorkflows';

export function WorkflowList() {
  const { euiTheme } = useEuiTheme();
  const { application, notifications } = useKibana().services;
  const { data: workflows, isLoading: isLoadingWorkflows, error } = useWorkflows();
  const { deleteWorkflows, runWorkflow } = useWorkflowActions();

  const [selectedItems, setSelectedItems] = useState<WorkflowListItemDto[]>([]);

  const canExecuteWorkflow = application?.capabilities.executeWorkflow;
  const canDeleteWorkflow = application?.capabilities.executeWorkflow;

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

  const getAvailableActions = useCallback(() => {
    const availableActions: Array<Action<WorkflowListItemDto>> = [];

    if (canExecuteWorkflow) {
      availableActions.push({
        isPrimary: true,
        type: 'icon',
        color: 'primary',
        name: 'Run',
        icon: 'play',
        description: 'Run',
        onClick: (item: WorkflowListItemDto) => handleRunWorkflow(item),
      });
    }
    if (canDeleteWorkflow) {
      availableActions.push({
        type: 'icon',
        color: 'danger',
        name: 'Delete',
        icon: 'trash',
        description: 'Delete',
        onClick: (item: WorkflowListItemDto) => handleDeleteWorkflow(item),
      });
    }
    return availableActions;
  }, [canExecuteWorkflow, canDeleteWorkflow, handleRunWorkflow, handleDeleteWorkflow]);

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
        name: 'Tags',
        field: 'tags',
        render: (value, item) => {
          return (
            <>
              {item.tags?.map((tag: string) => (
                <EuiBadge key={tag} color="hollow">
                  {tag}
                </EuiBadge>
              ))}
            </>
          );
        },
      },
      {
        name: 'Triggers',
        field: 'triggers',
        render: (value, item) => {
          if (!item.definition?.triggers?.length) {
            return (
              <EuiText size="s" color="subdued">
                No triggers
              </EuiText>
            );
          }
          return (
            <EuiText size="s" color="subdued">
              {item?.definition?.triggers.map((trigger) => toSentenceCase(trigger.type)).join(', ')}
            </EuiText>
          );
        },
      },
      {
        name: 'Run history',
        field: 'runHistory',
        render: (value, item) => {
          if (!item.history.length) {
            return (
              <EuiText size="s" color="subdued">
                No runs
              </EuiText>
            );
          }
          const data = item.history.map((run, index) => ({
            x: index,
            y: run.duration,
            startedAt: run.startedAt,
            color:
              run.status === ExecutionStatus.COMPLETED
                ? euiTheme.colors.vis.euiColorVis0
                : run.status === ExecutionStatus.FAILED
                ? euiTheme.colors.vis.euiColorVis6
                : euiTheme.colors.vis.euiColorVis1,
          }));
          return (
            <Chart size={{ width: 160, height: 32 }}>
              <Settings
                xDomain={{ min: -0.5, max: Math.max(data.length - 0.5, 4.5) }}
                theme={{
                  scales: {
                    barsPadding: 0.2,
                  },
                }}
              />
              <BarSeries
                id="data"
                xScaleType={ScaleType.Linear}
                yScaleType={ScaleType.Linear}
                xAccessor="x"
                yAccessors={['y']}
                data={data ?? []}
                styleAccessor={({ datum }) => datum.color}
                enableHistogramMode={true}
              />
            </Chart>
          );
        },
      },
      {
        name: 'Actions',
        actions: getAvailableActions(),
      },
    ],
    [
      getAvailableActions,
      euiTheme.colors.vis.euiColorVis0,
      euiTheme.colors.vis.euiColorVis1,
      euiTheme.colors.vis.euiColorVis6,
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

  return (
    <>
      <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
        {canDeleteWorkflow && (
          <EuiButton
            color="danger"
            iconType="trash"
            onClick={deleteSelectedWorkflows}
            isDisabled={selectedItems.length === 0}
          >
            Delete {selectedItems.length || 'selected'} workflows
          </EuiButton>
        )}
      </EuiFlexGroup>
      <EuiSpacer />
      <EuiBasicTable
        columns={columns}
        items={workflows?.results ?? []}
        itemId="id"
        responsiveBreakpoint={false}
        selection={{
          onSelectionChange: setSelectedItems,
          selectable: () => true,
          initialSelected: selectedItems,
        }}
      />
    </>
  );
}
