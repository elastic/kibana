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
import {
  fromAPItoLensState as fromXYAPIToLensState,
  fromLensStateToAPI as fromXYLensStateToAPI,
} from './transforms/charts/xy';
import {
  fromAPItoLensState as fromGaugeAPItoLensState,
  fromLensStateToAPI as fromGaugeLensStateToAPI,
} from './transforms/charts/gauge';
import {
  fromAPItoLensState as fromTagcloudAPItoLensState,
  fromLensStateToAPI as fromTagcloudLensStateToAPI,
} from './transforms/charts/tagcloud';
import type { LensApiState } from './schema';
import { filtersAndQueryToApiFormat, filtersAndQueryToLensState } from './transforms/utils';
import { isLensLegacyFormat } from './utils';

const compatibilityMap: Record<string, string> = {
  lnsMetric: 'metric',
  lnsLegacyMetric: 'legacy_metric',
  lnsXY: 'xy',
  lnsGauge: 'gauge',
  lnsTagcloud: 'tagcloud',
};

/**
 * A minimal type to extend for type lookup
 */
type ChartTypeLike =
  | Pick<LensAttributes, 'visualizationType'>
  | Pick<LensConfig, 'chartType'>
  | Pick<LensApiState, 'type'>
  | { visualizationType: null | undefined }
  | undefined;

const apiConvertersByChart = {
  metric: { fromAPItoLensState, fromLensStateToAPI },
  legacy_metric: {
    fromAPItoLensState: fromLegacyMetricAPItoLensState,
    fromLensStateToAPI: fromLegacyMetricLensStateToAPI,
  },
  xy: {
    fromAPItoLensState: fromXYAPIToLensState,
    fromLensStateToAPI: fromXYLensStateToAPI,
  },
  gauge: {
    fromAPItoLensState: fromGaugeAPItoLensState,
    fromLensStateToAPI: fromGaugeLensStateToAPI,
  },
  tagcloud: {
    fromAPItoLensState: fromTagcloudAPItoLensState,
    fromLensStateToAPI: fromTagcloudLensStateToAPI,
  },
} as const;

export const isSOChartTYpeSupported = (chartType?: string | null): boolean =>
  Boolean(
    chartType &&
      chartType in compatibilityMap &&
      compatibilityMap[chartType] in apiConvertersByChart
  );

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

  private apiConvertersByChart = apiConvertersByChart;
  private dataViewsAPI: DataViewsCommon | undefined;
  private enableAPITransforms: boolean;

  constructor(dataViewsAPI?: DataViewsCommon, enableAPITransforms = false) {
    this.dataViewsAPI = dataViewsAPI;
    this.enableAPITransforms = enableAPITransforms;
  }

  public get isEnabled() {
    return this.enableAPITransforms;
  }

  public setEnabled(enabled: boolean) {
    this.enableAPITransforms = enabled;
  }

  isSupported(chartType?: string | null): boolean {
    if (!this.enableAPITransforms) return false;
    if (!chartType) return false;
    const type = compatibilityMap[chartType] ?? chartType;
    return type in this.apiConvertersByChart;
  }

  getType<C extends ChartTypeLike>(config: C): string | undefined | null {
    if (config == null) {
      return null;
    }
    return 'visualizationType' in config
      ? config.visualizationType
      : isLensLegacyFormat(config)
      ? config.chartType
      : 'type' in config
      ? config.type
      : null;
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
      // @TODO investigate why it complains about missing type
      // type: 'lens',
      ...attributes,
      state: {
        ...attributes.state,
        query: { language: 'kuery', query: '' },
        ...filtersAndQueryToLensState(config),
      },
    };
  }

  toAPIFormat(config: LensAttributes): LensApiState {
    const visType = config.visualizationType;
    const type = compatibilityMap[visType];

    if (!type || !(type in this.apiConvertersByChart)) {
      throw new Error(`No API converter found for chart type: ${visType} as ${type}`);
    }
    const converter = this.apiConvertersByChart[type as keyof typeof this.apiConvertersByChart];
    // @ts-expect-error upgrade typescript v5.9.3
    return {
      ...converter.fromLensStateToAPI(config),
      ...filtersAndQueryToApiFormat(config),
    };
  }
}
