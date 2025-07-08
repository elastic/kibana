import React, { useMemo } from 'react';
import {
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiBasicTable,
  EuiBasicTableColumn,
  EuiLink,
} from '@elastic/eui';
import { Link } from 'react-router-dom';
import { Chart, BarSeries, ScaleType, Settings } from '@elastic/charts';
import { useWorkflows } from '../../../entities/workflows/model/useWorkflows';
import { WorkflowListItemDTO } from '../../../../common/workflows/models/types';

export function WorkflowList() {
  const { data: workflows, isLoading: isLoadingWorkflows, error } = useWorkflows();
  const columns = useMemo<Array<EuiBasicTableColumn<WorkflowListItemDTO>>>(
    () => [
      {
        field: 'name',
        name: 'Name',
        dataType: 'string',
        render: (name: string, item: WorkflowListItemDTO) => (
          <EuiLink>
            <Link to={`/${item.id}`}>{name}</Link>
          </EuiLink>
        ),
      },
      {
        field: 'description',
        name: 'Description',
        dataType: 'string',
      },
      {
        name: 'Last executions',
        render: (item: WorkflowListItemDTO) => {
          if (!item.runHistory.length) {
            return (
              <EuiText size="s" color="subdued">
                No runs
              </EuiText>
            );
          }
          const data = item.runHistory.map((run) => [
            new Date(run.startedAt).getTime(),
            run.duration,
          ]);
          return (
            <Chart size={{ width: 100, height: 20 }}>
              <Settings />
              <BarSeries
                id="data"
                xScaleType={ScaleType.Time}
                yScaleType={ScaleType.Linear}
                xAccessor={0}
                yAccessors={[1]}
                data={data ?? []}
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
            type: 'button',
            name: 'View logs',
            description: 'View logs',
            color: 'text',
            onClick: (item: WorkflowListItemDTO) => {
              // console.log(item);
            },
          },
          {
            isPrimary: true,
            type: 'icon',
            color: 'primary',
            name: 'Run',
            icon: 'play',
            description: 'Run',
            onClick: (item: WorkflowListItemDTO) => {},
          },
        ],
      },
    ],
    []
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
    <EuiBasicTable
      columns={columns}
      items={workflows?.results ?? []}
      responsiveBreakpoint={false}
    />
  );
}
