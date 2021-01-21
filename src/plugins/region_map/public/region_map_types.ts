/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { SchemaConfig } from 'src/plugins/visualizations/public';
import { VectorLayer, FileLayerField, WMSOptions } from '../../maps_legacy/public/index';

export interface RegionMapVisParams {
  readonly addTooltip: true;
  readonly legendPosition: 'bottomright';
  colorSchema: string;
  emsHotLink?: string | null;
  mapCenter: [number, number];
  mapZoom: number;
  outlineWeight: number | '';
  isDisplayWarning: boolean;
  showAllShapes: boolean;
  selectedLayer?: VectorLayer;
  selectedJoinField?: FileLayerField;
  wms: WMSOptions;
}

export interface RegionMapVisConfig extends RegionMapVisParams {
  metric: SchemaConfig;
  bucket?: SchemaConfig;
}
