/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPageHeader,
  EuiPageTemplate,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import React from 'react';
import {
  Axis,
  BarSeries,
  Chart,
  Color,
  niceTimeFormatter,
  Position,
  ScaleType,
  Settings,
  Tooltip,
} from '@elastic/charts';
import { ExecutionStatus } from '@kbn/workflows';
import { timeFormatter } from '@elastic/charts/dist/utils/data/formatters';
import { useWorkflowStats } from '../../entities/workflows/model/use_workflow_stats';

export function WorkflowsOverviewPage() {
  const { application, chrome } = useKibana().services;
  const { data, isLoading } = useWorkflowStats();

  chrome!.setBreadcrumbs([
    {
      text: i18n.translate('workflows.breadcrumbs.title', { defaultMessage: 'Workflows' }),
      href: application!.getUrlForApp('workflows', { path: '/' }),
    },
    {
      text: i18n.translate('workflows.breadcrumbs.overviewTitle', { defaultMessage: 'Overview' }),
      href: application!.getUrlForApp('workflows', { path: '/overview' }),
    },
  ]);

  chrome!.docTitle.change([
    i18n.translate('workflows.breadcrumbs.title', { defaultMessage: 'Workflows Overview' }),
  ]);
  const { euiTheme } = useEuiTheme();

  if (isLoading || data === undefined) {
    return <EuiPageTemplate offset={0} />;
  }

  const executionStats: any[] = [];
  data.executions.forEach((day, index) => {
    executionStats.push({
      timestamp: day.timestamp,
      count: day.completed,
      label: ExecutionStatus.COMPLETED,
    });
    executionStats.push({
      timestamp: day.timestamp,
      count: day.failed,
      label: ExecutionStatus.FAILED,
    });
    executionStats.push({
      timestamp: day.timestamp,
      count: day.cancelled,
      label: ExecutionStatus.CANCELLED,
    });
  });

  const timestamps: number[] = executionStats.map((d) => d.timestamp);
  const dateFormatter = niceTimeFormatter([Math.min(...timestamps), Math.max(...timestamps)]);
  const tooltipTimeFormatter = timeFormatter('YYYY-MM-DD');

  const colorMap: Record<ExecutionStatus, Color> = {
    [ExecutionStatus.COMPLETED]: euiTheme.colors.vis.euiColorVis0,
    [ExecutionStatus.FAILED]: euiTheme.colors.vis.euiColorVis6,
    [ExecutionStatus.CANCELLED]: euiTheme.colors.vis.euiColorVis8,
    [ExecutionStatus.PENDING]: euiTheme.colors.vis.euiColorVis1,
    [ExecutionStatus.WAITING_FOR_INPUT]: euiTheme.colors.vis.euiColorVis1,
    [ExecutionStatus.RUNNING]: euiTheme.colors.vis.euiColorVis1,
    [ExecutionStatus.SKIPPED]: euiTheme.colors.vis.euiColorVis1,
  };

  return (
    <EuiPageTemplate offset={0}>
      <EuiPageTemplate.Header>
        <EuiFlexGroup justifyContent={'spaceBetween'}>
          <EuiFlexItem>
            <EuiPageHeader
              pageTitle={
                <FormattedMessage id="workflows.pageTitle" defaultMessage="Overview" ignoreTag />
              }
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPageTemplate.Header>
      <EuiPageTemplate.Section restrictWidth={false}>
        <Chart size={{ height: 200, width: '100%' }}>
          <Settings
            showLegend
            legendPosition={Position.Right}
            theme={{
              scales: {
                barsPadding: 0.2,
              },
            }}
          />
          <Tooltip headerFormatter={({ value }) => tooltipTimeFormatter(value)} type="follow" />
          <Axis
            id="bottom-axis"
            position={Position.Bottom}
            title="Date"
            tickFormat={dateFormatter}
          />
          <Axis id="left-axis" position={Position.Left} title="Executions" />

          <BarSeries
            id="workflows-executions-stats"
            xScaleType={ScaleType.Time}
            yScaleType={ScaleType.Linear}
            xAccessor="timestamp"
            yAccessors={['count']}
            data={executionStats ?? []}
            splitSeriesAccessors={['label']}
            stackAccessors={['timestamp']}
            color={({ seriesKeys }) => {
              const status = seriesKeys[0] as ExecutionStatus;
              return colorMap[status] || euiTheme.colors.textParagraph;
            }}
            enableHistogramMode={true}
          />
        </Chart>
      </EuiPageTemplate.Section>
    </EuiPageTemplate>
  );
}
