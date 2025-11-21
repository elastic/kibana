/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useEffect, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { from, stats, sort } from '@kbn/esql-composer';
import {
  LensConfigBuilder,
  type LensXYConfig,
  type LensSeriesLayer,
} from '@kbn/lens-embeddable-utils/config_builder';
import type { LensAttributes } from '@kbn/lens-embeddable-utils/config_builder';
import { EuiLoadingChart, EuiFlexGroup, EuiCallOut } from '@elastic/eui';
import { useDataSourcesContext } from '../../../observability/traces/hooks/use_data_sources';
import { getUnifiedDocViewerServices } from '../../../../plugin';
import { ContentFrameworkChart } from '../../../content_framework/chart';

const chartTitle = i18n.translate(
  'unifiedDocViewer.docViewerLogsOverview.subComponents.similarErrors.occurrences.title',
  {
    defaultMessage: 'Occurrences',
  }
);

const errorMessage = i18n.translate(
  'unifiedDocViewer.docViewerLogsOverview.subComponents.similarErrors.occurrences.error',
  {
    defaultMessage: 'An error occurred while fetching chart data.',
  }
);

const chartLayers: LensSeriesLayer[] = [
  {
    type: 'series',
    seriesType: 'bar',
    xAxis: {
      type: 'dateHistogram',
      field: '@timestamp',
    },
    yAxis: [
      {
        value: 'occurrences',
        label: 'Occurrences',
        format: 'number',
      },
    ],
  },
];

const defaultLensConfig: Omit<LensXYConfig, 'title' | 'dataset'> = {
  chartType: 'xy',
  layers: chartLayers,
  legend: {
    show: false,
  },
  axisTitleVisibility: {
    showXAxisTitle: false,
    showYAxisTitle: false,
    showYRightAxisTitle: false,
  },
  fittingFunction: 'Linear',
};

export interface SimilarErrorsOccurrencesChartProps {
  baseEsqlQuery: ReturnType<typeof import('./get_esql_query').getEsqlQuery>;
}

export function SimilarErrorsOccurrencesChart({
  baseEsqlQuery,
}: SimilarErrorsOccurrencesChartProps) {
  const { data, lens } = getUnifiedDocViewerServices();
  const { indexes } = useDataSourcesContext();
  const [lensAttributes, setLensAttributes] = useState<LensAttributes | undefined>(undefined);
  const [hasError, setHasError] = useState<boolean>(false);
  const EmbeddableComponent = useMemo(() => lens?.EmbeddableComponent, [lens]);
  const timeRange = useMemo(
    () => data.query.timefilter.timefilter.getTime(),
    [data.query.timefilter.timefilter]
  );

  const chartEsqlQuery = useMemo(() => {
    if (!baseEsqlQuery || !indexes.logs) {
      return undefined;
    }

    return from(indexes.logs)
      .pipe(
        baseEsqlQuery,
        stats('occurrences = COUNT(*) BY @timestamp = BUCKET(@timestamp, 100, ?_tstart, ?_tend)'),
        sort('@timestamp')
      )
      .toString();
  }, [baseEsqlQuery, indexes.logs]);

  useEffect(() => {
    if (!chartEsqlQuery || !data.dataViews) {
      setLensAttributes(undefined);
      setHasError(false);
      return;
    }

    const builder = new LensConfigBuilder(data.dataViews);
    const lensConfig: LensXYConfig = {
      ...defaultLensConfig,
      title: chartTitle,
      dataset: {
        esql: chartEsqlQuery,
      },
    };

    const buildAttributes = async () => {
      try {
        const attributes = (await builder.build(lensConfig, {
          query: {
            esql: chartEsqlQuery,
          },
        })) as LensAttributes;

        setLensAttributes(attributes);
        setHasError(false);
      } catch (err) {
        setLensAttributes(undefined);
        setHasError(true);
      }
    };

    buildAttributes();
  }, [chartEsqlQuery, data.dataViews]);

  const content = useMemo(() => {
    if (!lensAttributes || !EmbeddableComponent) {
      return <EuiLoadingChart size="l" />; // TODO Place loading in the center of the area
    }

    return (
      <EmbeddableComponent
        id="similar-errors-chart"
        attributes={lensAttributes}
        timeRange={timeRange}
        esqlVariables={[]}
        viewMode="view"
        noPadding={true}
        style={{ height: 120 }}
      />
    );
  }, [lensAttributes, EmbeddableComponent, timeRange]);

  if (hasError) {
    return <EuiCallOut color="danger" announceOnMount size="s" title={errorMessage} />;
  }

  return (
    <EuiFlexGroup
      data-test-subj="docViewerSimilarErrorsOccurrencesChart"
      justifyContent="center"
      alignItems="center"
      style={{ height: 132 }}
    >
      <ContentFrameworkChart
        data-test-subj="docViewerSimilarErrorsOccurrencesChart"
        title={chartTitle}
      >
        {content}
      </ContentFrameworkChart>
    </EuiFlexGroup>
  );
}
