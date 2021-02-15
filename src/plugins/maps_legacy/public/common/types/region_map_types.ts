/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { VectorLayer, FileLayerField } from '../../index';
import { WMSOptions } from './external_basemap_types';

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
