/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import { from, stats, sort } from '@kbn/esql-composer';
import {
  LensConfigBuilder,
  type LensXYConfig,
  type LensSeriesLayer,
  type LensAnnotationLayer,
} from '@kbn/lens-embeddable-utils/config_builder';
import type { LensAttributes } from '@kbn/lens-embeddable-utils/config_builder';
import { EuiCallOut, EuiLoadingChart, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { fieldConstants } from '@kbn/discover-utils';
import { useDataSourcesContext } from '../../../../../hooks/use_data_sources';
import { getUnifiedDocViewerServices } from '../../../../../plugin';
import { ContentFrameworkChart } from '../../../../content_framework/chart';

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
  baseEsqlQuery: ReturnType<typeof import('../get_esql_query').getEsqlQuery>;
  currentDocumentTimestamp?: string;
}

const currentDocumentLabel = i18n.translate(
  'unifiedDocViewer.docViewerLogsOverview.subComponents.similarErrors.occurrences.currentDocument',
  {
    defaultMessage: 'Current document',
  }
);

export function SimilarErrorsOccurrencesChart({
  baseEsqlQuery,
  currentDocumentTimestamp,
}: SimilarErrorsOccurrencesChartProps) {
  const { data } = getUnifiedDocViewerServices();
  const { euiTheme } = useEuiTheme();
  const { indexes } = useDataSourcesContext();
  const [lensAttributes, setLensAttributes] = useState<LensAttributes | undefined>(undefined);
  const [hasError, setHasError] = useState<boolean>(false);
  const timeRange = useMemo(
    () => data.query.timefilter.timefilter.getTime(),
    [data.query.timefilter.timefilter]
  );

  const createAnnotationLayer = useCallback(
    (timestamp: string): LensAnnotationLayer => ({
      type: 'annotation',
      yAxis: [], // Annotation layers don't use yAxis but it's required by the type
      events: [
        {
          name: currentDocumentLabel,
          datetime: timestamp,
          color: euiTheme.colors.accent,
        },
      ],
    }),
    [euiTheme.colors.accent]
  );

  const chartEsqlQuery = useMemo(() => {
    if (!baseEsqlQuery || !indexes.logs) {
      return undefined;
    }

    return from(indexes.logs)
      .pipe(
        baseEsqlQuery,
        stats(
          `occurrences = COUNT(*) BY ${fieldConstants.TIMESTAMP_FIELD} = BUCKET(${fieldConstants.TIMESTAMP_FIELD}, 100, ?_tstart, ?_tend)`
        ),
        sort(fieldConstants.TIMESTAMP_FIELD)
      )
      .toString();
  }, [baseEsqlQuery, indexes.logs]);

  const getParentApi = useCallback(() => {
    return {
      getSerializedStateForChild: () => ({
        attributes: lensAttributes,
        viewMode: 'view',
        timeRange,
        esqlVariables: [],
      }),
      noPadding: true,
    };
  }, [lensAttributes, timeRange]);

  useEffect(() => {
    if (!chartEsqlQuery || !data.dataViews) {
      setLensAttributes(undefined);
      setHasError(false);
      return;
    }

    const builder = new LensConfigBuilder(data.dataViews);

    // Build layers array with series layer and optional annotation layer
    const layers: Array<LensSeriesLayer | LensAnnotationLayer> = [...chartLayers];

    // Add annotation layer to mark the current document if timestamp is provided
    if (currentDocumentTimestamp) {
      layers.push(createAnnotationLayer(currentDocumentTimestamp));
    }

    const lensConfig: LensXYConfig = {
      ...defaultLensConfig,
      layers,
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
  }, [chartEsqlQuery, data.dataViews, currentDocumentTimestamp, createAnnotationLayer]);

  const content = useMemo(() => {
    if (!lensAttributes) {
      return (
        <EuiFlexGroup style={{ height: 120 }} justifyContent="center" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiLoadingChart size="l" data-test-subj="similarErrorsOccurrencesChartLoading" />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    }

    return (
      <div style={{ height: '120px', width: '100%' }}>
        {/* TODO update the string with LENS_EMBEDDABLE_TYPE once is moved to @kbn/lens-common
        https://github.com/elastic/kibana/issues/245192 */}
        <EmbeddableRenderer type={'lens'} getParentApi={getParentApi} hidePanelChrome />
      </div>
    );
  }, [getParentApi, lensAttributes]);

  if (hasError) {
    return <EuiCallOut color="danger" announceOnMount size="s" title={errorMessage} />;
  }

  return (
    <ContentFrameworkChart
      data-test-subj="docViewerSimilarErrorsOccurrencesChart"
      title={chartTitle}
    >
      {content}
    </ContentFrameworkChart>
  );
}
