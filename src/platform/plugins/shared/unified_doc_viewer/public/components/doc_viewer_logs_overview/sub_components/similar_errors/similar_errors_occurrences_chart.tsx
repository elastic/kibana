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
import type { XYLegendValue } from '@kbn/chart-expressions-common';
import { ContentFrameworkChart } from '../../../content_framework/chart';
import { useDataSourcesContext } from '../../../observability/traces/hooks/use_data_sources';
import { getUnifiedDocViewerServices } from '../../../../plugin';

const chartTitle = i18n.translate(
  'unifiedDocViewer.docViewerLogsOverview.subComponents.similarErrors.occurrences.title',
  {
    defaultMessage: 'Occurrences',
  }
);

export interface SimilarErrorsOccurrencesChartProps {
  baseEsqlQuery: ReturnType<typeof import('./get_esql_query').getEsqlQuery>;
}

export function SimilarErrorsOccurrencesChart({
  baseEsqlQuery,
  title = chartTitle,
}: SimilarErrorsOccurrencesChartProps) {
  const { data, lens } = getUnifiedDocViewerServices();
  const { indexes } = useDataSourcesContext();
  const EmbeddableComponent = lens?.EmbeddableComponent;
  const timeRange = data.query.timefilter.timefilter.getTime();

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

  // Build Lens attributes from ES|QL query
  const [lensAttributes, setLensAttributes] = useState<LensAttributes | undefined>(undefined);

  useEffect(() => {
    if (!chartEsqlQuery || !data.dataViews) {
      setLensAttributes(undefined);
      return;
    }

    const buildAttributes = async () => {
      try {
        const builder = new LensConfigBuilder(data.dataViews);
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
        const lensConfig: LensXYConfig = {
          chartType: 'xy',
          title,
          dataset: {
            esql: chartEsqlQuery,
          },
          layers: chartLayers,
          legend: {
            show: true,
            position: 'bottom',
            legendStats: ['total' as XYLegendValue],
          },
          axisTitleVisibility: {
            showXAxisTitle: false,
            showYAxisTitle: false,
            showYRightAxisTitle: false,
          },
          fittingFunction: 'Linear',
        };

        const attributes = (await builder.build(lensConfig, {
          query: {
            esql: chartEsqlQuery,
          },
        })) as LensAttributes;

        // Ensure legend shows even with single series and displays total
        if (attributes.state?.visualization) {
          const visualization = attributes.state.visualization as any;
          if (visualization.legend) {
            visualization.legend.showSingleSeries = true;
            visualization.legend.isVisible = true;
          }
        }

        // Update column label to "Occurrences" in datasource layers
        // Note: LensConfigBuilder doesn't support passing label directly for ES|QL columns
        // when using textBased datasource, so we update it after building the attributes
        if (attributes.state?.datasourceStates?.textBased?.layers) {
          const layers = attributes.state.datasourceStates.textBased.layers;
          Object.keys(layers).forEach((layerId) => {
            const layer = layers[layerId];
            if (layer.columns) {
              layer.columns.forEach((column: any) => {
                // Find the column that references "occurrences" field from our ES|QL query
                if (column.fieldName === 'occurrences') {
                  column.label = 'Occurrences';
                  column.customLabel = true;
                }
              });
            }
          });
        }

        setLensAttributes(attributes);
      } catch (error) {
        // TODO handle error gracefully (?)
        console.error('Error building Lens attributes:', error);
        setLensAttributes(undefined);
      }
    };

    buildAttributes();
  }, [chartEsqlQuery, data.dataViews, title]);

  if (!lensAttributes || !EmbeddableComponent) {
    return null;
  }

  return (
    <ContentFrameworkChart data-test-subj="docViewerSimilarErrorsLatencyChart" title={title}>
      <EmbeddableComponent
        id="similar-errors-chart"
        attributes={lensAttributes}
        timeRange={timeRange}
        esqlVariables={[]}
        viewMode="view"
        noPadding={true}
        style={{ height: 150 }}
      />
    </ContentFrameworkChart>
  );
}
