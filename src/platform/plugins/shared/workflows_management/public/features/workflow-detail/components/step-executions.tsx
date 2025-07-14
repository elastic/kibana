/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
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
interface StepExecutionsProps {
  workflowExecutionId: string;
}

export function useStepExecutions(workflowExecutionId: string | null) {
  const { http } = useKibana().services;

  const queryResult = useQuery<any[]>({
    queryKey: ['stepExecutions', workflowExecutionId],
    queryFn: () => http!.get(`/api/workflowRun/${workflowExecutionId}/stepExecutions`),
    enabled: workflowExecutionId !== null,
  });

  const queryClient = useQueryClient();

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['stepExecutions', workflowExecutionId] });
  };

  const res = useMemo(() => {
    let data;

    if (queryResult.data) {
      data = queryResult.data.sort(
        (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
      );
    }

    return {
      ...queryResult,
      data,
    };
  }, [queryResult]);

  return {
    ...res,
    refresh,
  };
}

export const StepExecutions: React.FC<StepExecutionsProps> = ({ workflowExecutionId }) => {
  const {
    data: stepExecutions,
    isLoading,
    error,
    refresh,
  } = useStepExecutions(workflowExecutionId);

  const columns = useMemo<Array<EuiBasicTableColumn<any>>>(
    () => [
      {
        field: 'stepId',
        name: 'Step ID',
        dataType: 'string',
        render: (value: string, item) => <EuiText>{value}</EuiText>,
      },
      {
        field: 'workflowId',
        name: 'Workflow ID',
        dataType: 'string',
        render: (value: string, item) => <EuiText>{value}</EuiText>,
      },
      {
        field: 'status',
        name: 'Status',
        dataType: 'string',
        render: (value: string, item) => <EuiText>{value}</EuiText>,
      },
      {
        field: 'executionTimeMs',
        name: 'Execution Time (ms)',
        dataType: 'string',
        render: (value: string, item) => <EuiText>{value}</EuiText>,
      },
      // {
      //   name: 'Tags',
      //   field: 'tags',
      //   render: (value, item) => {
      //     return (
      //       <>
      //         {item.tags.map((tag) => (
      //           <EuiBadge key={tag} color="hollow">
      //             {tag}
      //           </EuiBadge>
      //         ))}
      //       </>
      //     );
      //   },
      // },
      // {
      //   name: 'Triggers',
      //   field: 'triggers',
      //   render: (value, item) => {
      //     return (
      //       <EuiText size="s" color="subdued">
      //         {item.triggers.map((trigger) => toSentenceCase(trigger.type)).join(', ')}
      //       </EuiText>
      //     );
      //   },
      // },
      // {
      //   name: 'Run history',
      //   field: 'runHistory',
      //   render: (value, item) => {
      //     if (!item.history.length) {
      //       return (
      //         <EuiText size="s" color="subdued">
      //           No runs
      //         </EuiText>
      //       );
      //     }
      //     const data = item.history.map((run) => ({
      //       x: new Date(run.startedAt).getTime(),
      //       y: run.duration,
      //       color:
      //         run.status === ExecutionStatus.COMPLETED
      //           ? euiTheme.colors.vis.euiColorVis0
      //           : run.status === ExecutionStatus.FAILED
      //           ? euiTheme.colors.vis.euiColorVis6
      //           : euiTheme.colors.vis.euiColorVis1,
      //     }));
      //     return (
      //       <Chart size={{ width: 160, height: 32 }}>
      //         <Settings />
      //         <BarSeries
      //           id="data"
      //           xScaleType={ScaleType.Time}
      //           yScaleType={ScaleType.Linear}
      //           xAccessor={({ x }) => x}
      //           yAccessors={[({ y }) => y ?? 0]}
      //           data={data ?? []}
      //           styleAccessor={({ datum }) => datum.color}
      //         />
      //       </Chart>
      //     );
      //   },
      // },
      // {
      //   name: 'Actions',
      //   actions: [
      //     {
      //       isPrimary: true,
      //       type: 'button',
      //       name: 'View logs',
      //       description: 'View logs',
      //       color: 'text',
      //       onClick: (item) => {
      //         // console.log(item);
      //       },
      //     },
      //     {
      //       isPrimary: true,
      //       type: 'icon',
      //       color: 'primary',
      //       name: 'Run',
      //       icon: 'play',
      //       description: 'Run',
      //       onClick: (item) => {},
      //     },
      //   ],
      // },
    ],
    []
  );

  useEffect(() => {
    if (!stepExecutions) {
      return;
    }

    const intervalId = setInterval(() => {
      if (!stepExecutions.length || stepExecutions.some((step) => step.status !== 'completed')) {
        refresh();
        return;
      }

      clearInterval(intervalId);
    }, 500); // Refresh every 5 seconds

    return () => clearInterval(intervalId);
  }, [stepExecutions, refresh]);

  if (isLoading) {
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
    <EuiBasicTable columns={columns} items={stepExecutions ?? []} responsiveBreakpoint={false} />
  );
};
