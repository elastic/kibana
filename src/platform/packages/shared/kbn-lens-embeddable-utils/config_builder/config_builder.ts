/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { LensEmbeddableInput } from '@kbn/lens-common';
import { v4 as uuidv4 } from 'uuid';
import type { LensAttributes, LensConfig, LensConfigOptions, DataViewsCommon } from './types';
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
import {
  fromAPItoLensState as fromLegacyMetricAPItoLensState,
  fromLensStateToAPI as fromLegacyMetricLensStateToAPI,
} from './transforms/charts/legacy_metric';
import type { LensApiState } from './schema';
import { filtersAndQueryToApiFormat, filtersAndQueryToLensState } from './transforms/utils';

const compatibilityMap: Record<string, string> = {
  lnsMetric: 'metric',
  lnsLegacyMetric: 'legacy_metric',
};

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
    legacy_metric: {
      fromAPItoLensState: fromLegacyMetricAPItoLensState,
      fromLensStateToAPI: fromLegacyMetricLensStateToAPI,
    },
  } as const;
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
    config: LensConfig,
    options: LensConfigOptions = {}
  ): Promise<LensAttributes | LensEmbeddableInput> {
    if (!this.dataViewsAPI) {
      throw new Error('DataViews API is required to build Lens configurations');
    }

    const chartBuilderFn = this.charts[config.chartType];
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
    const chartType = config.type;

    if (!(chartType in this.apiConvertersByChart)) {
      throw new Error(`No attributes converter found for chart type: ${chartType}`);
    }

    const converter = this.apiConvertersByChart[chartType];
    const attributes = converter.fromAPItoLensState(config as any); // handle type mismatches

    return {
      ...attributes,
      state: {
        ...attributes.state,
        ...filtersAndQueryToLensState(config),
      },
    };
  }

  toAPIFormat(config: LensAttributes): LensApiState {
    const visType = config.visualizationType;
    const type = compatibilityMap[visType];

    if (!type || !(type in this.apiConvertersByChart)) {
      throw new Error(`No API converter found for chart type: ${visType}`);
    }
    const converter = this.apiConvertersByChart[type as keyof typeof this.apiConvertersByChart];
    return {
      ...converter.fromLensStateToAPI(config),
      ...filtersAndQueryToApiFormat(config),
    };
  }
}
