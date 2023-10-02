/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SavedObjectReference } from '@kbn/core/server';
import type { DataView } from '@kbn/data-views-plugin/common';
import type {
  FormulaPublicApi,
  FormBasedPersistedState,
  PersistedIndexPatternLayer,
  PieLayerState,
  TermsIndexPatternColumn,
} from '@kbn/lens-plugin/public';
import type { ChartColumn, ChartLayer, FormulaValueConfig } from '../../types';
import { getDefaultReferences, getTopValuesColumn, type TopValuesColumnParams } from '../../utils';
import { FormulaColumn } from './columns/formula';

const BREAKDOWN_COLUMN_NAME = 'aggs_breakdown';

interface TopValuesBucketedColumn {
  type: 'top_values';
  field: TermsIndexPatternColumn['sourceField'];
  params?: Partial<TopValuesColumnParams>;
}

export interface PieLayerOptions {
  // Add more types as support for them is implemented
  breakdown?: TopValuesBucketedColumn;
  // Add more types as support for them is implemented
}

export interface PieLayerConfig {
  data: FormulaValueConfig[];
  options?: PieLayerOptions;
  /**
   * It is possible to define a specific dataView for the layer. It will override the global chart one
   **/
  dataView?: DataView;
}

export class PieLayer implements ChartLayer<PieLayerState> {
  private column: ChartColumn[];
  private layerConfig: PieLayerConfig;
  constructor(layerConfig: PieLayerConfig) {
    this.column = layerConfig.data.map((dataItem) => new FormulaColumn(dataItem));
    this.layerConfig = {
      ...layerConfig,
      options: {
        ...layerConfig.options,
      },
    };
  }

  getName(): string | undefined {
    return this.column[0].getValueConfig().label;
  }

  getBaseLayer(dataView: DataView, options: PieLayerOptions) {
    return {
      ...getTopValuesColumn({
        columnName: BREAKDOWN_COLUMN_NAME,
        field: options?.breakdown!.field,
        options: {
          ...options.breakdown!.params,
        },
      }),
    };
  }

  getLayer(
    layerId: string,
    accessorId: string,
    chartDataView: DataView,
    formulaAPI: FormulaPublicApi
  ): FormBasedPersistedState['layers'] {
    const columnOrder: string[] = [];
    if (this.layerConfig.options?.breakdown?.type === 'top_values') {
      columnOrder.push(BREAKDOWN_COLUMN_NAME);
    }

    const baseLayer: PersistedIndexPatternLayer = {
      columnOrder,
      columns: {
        ...this.getBaseLayer(
          this.layerConfig.dataView ?? chartDataView,
          this.layerConfig.options ?? {}
        ),
      },
    };

    return {
      [layerId]: this.column.reduce(
        (acc, curr, index) => ({
          ...acc,
          ...curr.getData(
            `${accessorId}_${index}`,
            acc,
            this.layerConfig.dataView ?? chartDataView,
            formulaAPI
          ),
        }),
        baseLayer
      ),
    };
  }

  getReference(layerId: string, chartDataView: DataView): SavedObjectReference[] {
    return getDefaultReferences(this.layerConfig.dataView ?? chartDataView, layerId);
  }

  getLayerConfig(layerId: string, accessorId: string): PieLayerState {
    return {
      layerId,
      metrics: this.column.map((_, index) => `${accessorId}_${index}`),
      layerType: 'data',
      primaryGroups: [BREAKDOWN_COLUMN_NAME],
      categoryDisplay: 'default',
      numberDisplay: 'percent',
      legendDisplay: 'default',
    };
  }

  getDataView(): DataView | undefined {
    return this.layerConfig.dataView;
  }
}
