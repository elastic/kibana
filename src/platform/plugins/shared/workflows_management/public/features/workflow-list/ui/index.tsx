/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useMemo, useState } from 'react';
import {
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiLink,
  EuiBadge,
  useEuiTheme,
  toSentenceCase,
  EuiSpacer,
  EuiButton,
} from '@elastic/eui';
import { Link } from 'react-router-dom';
import { Chart, BarSeries, ScaleType, Settings } from '@elastic/charts';
import { ExecutionStatus, WorkflowListItemModel } from '@kbn/workflows';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useWorkflows } from '../../../entities/workflows/model/useWorkflows';
import { useWorkflowActions } from '../../../entities/workflows/model/useWorkflowActions';

export function WorkflowList() {
  const { euiTheme } = useEuiTheme();
  const { notifications } = useKibana().services;
  const { data: workflows, isLoading: isLoadingWorkflows, error } = useWorkflows();
  const { deleteWorkflows, runWorkflow } = useWorkflowActions();

  const [selectedItems, setSelectedItems] = useState<WorkflowListItemModel[]>([]);

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

  const handleRunWorkflow = (item: WorkflowListItemModel) => {
    runWorkflow.mutate(
      { id: item.id, inputs: {} },
      {
        onSuccess: () => {
          notifications?.toasts.addSuccess('Workflow run started', {
            toastLifeTimeMs: 3000,
          });
        },
        onError: (error: unknown) => {
          notifications?.toasts.addError(error, {
            toastLifeTimeMs: 3000,
            title: 'Failed to run workflow',
          });
        },
      }
    );
  };

  const handleDeleteWorkflow = (item: WorkflowListItemModel) => {
    const confirmed = window.confirm(`Are you sure you want to delete ${item.name}?`);
    if (!confirmed) {
      return;
    }
    deleteWorkflows.mutate({ ids: [item.id] });
  };

  const columns = useMemo<Array<EuiBasicTableColumn<WorkflowListItemModel>>>(
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
              {item.tags.map((tag) => (
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
          return (
            <EuiText size="s" color="subdued">
              {item.triggers.map((trigger) => toSentenceCase(trigger.type)).join(', ')}
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
        actions: [
          {
            isPrimary: true,
            type: 'icon',
            color: 'primary',
            name: 'Run',
            icon: 'play',
            description: 'Run',
            onClick: (item) => handleRunWorkflow(item),
          },
          {
            type: 'icon',
            color: 'danger',
            name: 'Delete',
            icon: 'trash',
            description: 'Delete',
            onClick: (item) => handleDeleteWorkflow(item),
          },
        ],
      },
    ],
    [
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
        <EuiButton
          color="danger"
          iconType="trash"
          onClick={deleteSelectedWorkflows}
          isDisabled={selectedItems.length === 0}
        >
          Delete {selectedItems.length || 'selected'} workflows
        </EuiButton>
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
