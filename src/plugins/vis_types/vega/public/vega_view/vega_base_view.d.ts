/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IExternalUrl } from 'kibana/public';
import { DataPublicPluginStart } from 'src/plugins/data/public';
import { IInterpreterRenderHandlers } from 'src/plugins/expressions';
import type { IServiceSettings } from './vega_map_view/service_settings/service_settings_types';
import { VegaParser } from '../data_model/vega_parser';
import { createVegaStateRestorer } from '../lib/vega_state_restorer';

interface VegaViewParams {
  parentEl: HTMLDivElement;
  fireEvent: IInterpreterRenderHandlers['event'];
  vegaParser: VegaParser;
  serviceSettings: IServiceSettings;
  filterManager: DataPublicPluginStart['query']['filterManager'];
  timefilter: DataPublicPluginStart['query']['timefilter']['timefilter'];
  vegaStateRestorer: ReturnType<typeof createVegaStateRestorer>;
  externalUrl: IExternalUrl;
}

export class VegaBaseView {
  constructor(params: VegaViewParams);
  init(): Promise<void>;
  onError(error: any): void;
  onWarn(error: any): void;
  setView(map: any): void;
  setDebugValues(view: any, spec: any, vlspec: any): void;
  _addDestroyHandler(handler: Function): void;

  destroy(): Promise<void>;
  resize(dimensions?: { height: number; width: number }): Promise<void>;

  _$container: any;
  _$controls: any;
  _parser: any;
  _vegaViewConfig: any;
  _serviceSettings: VegaViewParams['serviceSettings'];
  _vegaStateRestorer: VegaViewParams['vegaStateRestorer'];
}
