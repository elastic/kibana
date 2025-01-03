/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IExternalUrl } from '@kbn/core/public';
import { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { IInterpreterRenderHandlers } from '@kbn/expressions-plugin/common';
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

  _container: HTMLDivElement;
  _controls: HTMLDivElement;
  _parser: any;
  _vegaViewConfig: any;
  _serviceSettings: VegaViewParams['serviceSettings'];
  _vegaStateRestorer: VegaViewParams['vegaStateRestorer'];
}
