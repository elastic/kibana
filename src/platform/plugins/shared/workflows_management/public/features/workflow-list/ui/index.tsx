import React, { useMemo } from 'react';
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
} from '@elastic/eui';
import { Link } from 'react-router-dom';
import { Chart, BarSeries, ScaleType, Settings } from '@elastic/charts';
import { useWorkflows } from '../../../entities/workflows/model/useWorkflows';
import { ExecutionStatus, WorkflowListItemModel } from '@kbn/workflows';

export function WorkflowList() {
  const { data: workflows, isLoading: isLoadingWorkflows, error } = useWorkflows();
  const { euiTheme } = useEuiTheme();

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
          const data = item.history.map((run) => ({
            x: new Date(run.startedAt).getTime(),
            y: run.duration,
            color:
              run.status === ExecutionStatus.COMPLETED
                ? euiTheme.colors.vis.euiColorVis0
                : run.status === ExecutionStatus.FAILED
                ? euiTheme.colors.vis.euiColorVis6
                : euiTheme.colors.vis.euiColorVis1,
          }));
          return (
            <Chart size={{ width: 160, height: 32 }}>
              <Settings />
              <BarSeries
                id="data"
                xScaleType={ScaleType.Time}
                yScaleType={ScaleType.Linear}
                xAccessor={({ x }) => x}
                yAccessors={[({ y }) => y ?? 0]}
                data={data ?? []}
                styleAccessor={({ datum }) => datum.color}
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
            onClick: (item) => {
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
            onClick: (item) => {},
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
