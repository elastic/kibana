/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { DataPublicPluginStart } from 'src/plugins/data/public';
import { IInterpreterRenderHandlers } from 'src/plugins/expressions';
import { IServiceSettings } from 'src/plugins/maps_legacy/public';
import { VegaParser } from '../data_model/vega_parser';

interface VegaViewParams {
  parentEl: HTMLDivElement;
  fireEvent: IInterpreterRenderHandlers['event'];
  vegaParser: VegaParser;
  serviceSettings: IServiceSettings;
  filterManager: DataPublicPluginStart['query']['filterManager'];
  timefilter: DataPublicPluginStart['query']['timefilter']['timefilter'];
  // findIndex: (index: string) => Promise<...>;
}

export class VegaBaseView {
  constructor(params: VegaViewParams);
  init(): Promise<void>;
  onError(error: any): void;
  destroy(): Promise<void>;
}
