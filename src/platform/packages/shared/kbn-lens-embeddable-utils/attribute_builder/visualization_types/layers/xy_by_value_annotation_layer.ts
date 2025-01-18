/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectReference } from '@kbn/core/server';
import type { DataView } from '@kbn/data-views-plugin/common';
import { EventAnnotationConfig } from '@kbn/event-annotation-common';
import type { FormBasedPersistedState, PersistedIndexPatternLayer } from '@kbn/lens-plugin/public';
import type { XYByValueAnnotationLayerConfig } from '@kbn/lens-plugin/public/visualizations/xy/types';
import type { ChartLayer } from '../../types';
import { getDefaultReferences } from '../../utils';
import { XY_ANNOTATIONS_ID } from '../constants';

export interface XYByValueAnnotationsLayerConfig {
  annotations: EventAnnotationConfig[];
  layerType?: typeof XY_ANNOTATIONS_ID;
  /**
   * It is possible to define a specific dataView for the layer. It will override the global chart one
   **/
  dataView?: DataView;
  ignoreGlobalFilters?: boolean;
}

export class XYByValueAnnotationsLayer implements ChartLayer<XYByValueAnnotationLayerConfig> {
  private layerConfig: XYByValueAnnotationsLayerConfig;

  constructor(layerConfig: XYByValueAnnotationsLayerConfig) {
    this.layerConfig = {
      ...layerConfig,
      layerType: layerConfig.layerType ?? 'annotations',
    };
  }

  getName(): string | undefined {
    return this.layerConfig.annotations[0].label;
  }

  getLayer(layerId: string): FormBasedPersistedState['layers'] {
    const baseLayer = { columnOrder: [], columns: {} } as PersistedIndexPatternLayer;
    return {
      [`${layerId}_annotation`]: baseLayer,
    };
  }

  getReference(layerId: string, chartDataView: DataView): SavedObjectReference[] {
    return getDefaultReferences(this.layerConfig.dataView ?? chartDataView, `${layerId}_reference`);
  }

  getLayerConfig(layerId: string): XYByValueAnnotationLayerConfig {
    return {
      layerId: `${layerId}_annotation`,
      layerType: 'annotations',
      annotations: this.layerConfig.annotations,
      ignoreGlobalFilters: this.layerConfig.ignoreGlobalFilters || false,
      indexPatternId: this.layerConfig.dataView?.id || '',
    };
  }

  getDataView(): DataView | undefined {
    return this.layerConfig.dataView;
  }
}
