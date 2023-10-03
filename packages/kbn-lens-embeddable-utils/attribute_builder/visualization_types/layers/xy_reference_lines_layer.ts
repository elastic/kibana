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
  FormBasedPersistedState,
  PersistedIndexPatternLayer,
  XYReferenceLineLayerConfig,
} from '@kbn/lens-plugin/public';
import type { ChartLayer, StaticValueConfig, StaticChartColumn } from '../../types';
import { getDefaultReferences } from '../../utils';
import { StaticColumn } from './columns/static';

export interface XYReferenceLinesLayerConfig {
  data: StaticValueConfig[];
  /**
   * It is possible to define a specific dataView for the layer. It will override the global chart one
   **/
  dataView?: DataView;
}

export class XYReferenceLinesLayer implements ChartLayer<XYReferenceLineLayerConfig> {
  private column: StaticChartColumn[];
  constructor(private layerConfig: XYReferenceLinesLayerConfig) {
    this.column = layerConfig.data.map((p) => new StaticColumn(p));
  }

  getName(): string | undefined {
    return this.column[0].getValueConfig().label;
  }

  getLayer(layerId: string, accessorId: string): FormBasedPersistedState['layers'] {
    const baseLayer = { columnOrder: [], columns: {} } as PersistedIndexPatternLayer;
    return {
      [`${layerId}_reference`]: this.column.reduce((acc, curr, index) => {
        return {
          ...acc,
          ...curr.getData(`${accessorId}_${index}_reference_column`, acc),
        };
      }, baseLayer),
    };
  }

  getReference(layerId: string, chartDataView: DataView): SavedObjectReference[] {
    return getDefaultReferences(this.layerConfig.dataView ?? chartDataView, `${layerId}_reference`);
  }

  getLayerConfig(layerId: string, accessorId: string): XYReferenceLineLayerConfig {
    return {
      layerId: `${layerId}_reference`,
      layerType: 'referenceLine',
      accessors: this.column.map((_, index) => `${accessorId}_${index}_reference_column`),
      yConfig: this.column.map((layer, index) => ({
        color: layer.getValueConfig().color,
        forAccessor: `${accessorId}_${index}_reference_column`,
        axisMode: 'left',
      })),
    };
  }

  getDataView(): DataView | undefined {
    return this.layerConfig.dataView;
  }
}
