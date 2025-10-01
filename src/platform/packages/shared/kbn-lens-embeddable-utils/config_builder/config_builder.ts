/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LensEmbeddableInput } from '@kbn/lens-plugin/public';
import { v4 as uuidv4 } from 'uuid';
import type { DataViewsService } from '@kbn/data-views-plugin/common';
import type { LensAttributes, LensConfig, LensConfigOptions } from './types';
import {
  buildGauge,
  buildHeatmap,
  buildMetric,
  buildRegionMap,
  buildTagCloud,
  buildTable,
  buildXY,
  buildPartitionChart,
} from './charts';
import { fromAPItoLensState, fromLensStateToAPI } from './transforms/charts/metric';
import type { LensApiState } from './schema';
import { isLensLegacyFormat } from './utils';
import { filtersAndQueryToApiFormat, filtersAndQueryToLensState } from './transforms/utils';

export type DataViewsCommon = Pick<DataViewsService, 'get' | 'create'>;

export class LensConfigBuilder {
  private charts = {
    metric: buildMetric,
    tagcloud: buildTagCloud,
    treemap: buildPartitionChart,
    pie: buildPartitionChart,
    donut: buildPartitionChart,
    gauge: buildGauge,
    heatmap: buildHeatmap,
    mosaic: buildPartitionChart,
    regionmap: buildRegionMap,
    xy: buildXY,
    table: buildTable,
  };

  private apiConvertersByChart = {
    metric: { fromAPItoLensState, fromLensStateToAPI },
  };
  private dataViewsAPI: DataViewsCommon | undefined;

  constructor(dataViewsAPI?: DataViewsCommon) {
    this.dataViewsAPI = dataViewsAPI;
  }

  /**
   * Build a Lens configuration based on the provided API configuration
   * @param config ConfigBuilder API configuration
   * @param options
   * @returns Lens internal configuration
   */
  async build(
    config: LensConfig | LensApiState,
    options: LensConfigOptions = {}
  ): Promise<LensAttributes | LensEmbeddableInput> {
    if (!this.dataViewsAPI) {
      throw new Error('DataViews API is required to build Lens configurations');
    }

    const chartType = isLensLegacyFormat(config) ? config.chartType : config.type;
    const chartBuilderFn = this.charts[chartType];
    const chartConfig = await chartBuilderFn(config as any, {
      dataViewsAPI: this.dataViewsAPI,
    });

    const chartState = {
      ...chartConfig,
      state: {
        ...chartConfig.state,
        filters: options.filters || [],
        query: options.query || { language: 'kuery', query: '' },
      },
    };

    if (options.embeddable) {
      return {
        id: uuidv4(),
        attributes: chartState,
        timeRange: options.timeRange,
        references: chartState.references,
      } as LensEmbeddableInput;
    }

    return chartState as LensAttributes;
  }

  fromAPIFormat(config: LensApiState): LensAttributes {
    // Currently we only support metric conversion from API to attributes
    const chartType = config.type;
    if (chartType === 'metric') {
      const converter = this.apiConvertersByChart[chartType];
      const attributes = converter.fromAPItoLensState(config);

      return {
        ...attributes,
        state: {
          ...attributes.state,
          ...filtersAndQueryToLensState(config),
        },
      };
    }
    throw new Error(`No attributes converter found for chart type: ${chartType}`);
  }

  toAPIFormat(config: LensAttributes): LensApiState {
    const chartType = config.visualizationType;
    if (chartType === 'lnsMetric') {
      const converter = this.apiConvertersByChart.metric;
      return {
        ...converter.fromLensStateToAPI(config),
        ...filtersAndQueryToApiFormat(config),
      };
    }
    throw new Error(`No API converter found for chart type: ${chartType}`);
  }
}
