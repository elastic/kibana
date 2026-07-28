/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IExternalUrl } from '@kbn/core/public';
import type { RenderMode } from '@kbn/expressions-plugin/common';
import type { IServiceSettings } from './vega_map_view/service_settings/service_settings_types';
import type { VegaRenderDescriptor } from '../data_model/types';
import type { createVegaStateRestorer } from '../lib/vega_state_restorer';
import type { VegaInspectorAdapters } from '../vega_inspector';
import type { VegaFunctionIntent } from './vega_filter_action_handler';

type DebugValues = Parameters<VegaInspectorAdapters['vega']['bindInspectValues']>[0];

export interface VegaViewParams {
  parentEl: HTMLDivElement;
  vegaParser: VegaRenderDescriptor;
  bypassExternalUrlCheckUrls?: string[];
  serviceSettings: IServiceSettings;
  vegaStateRestorer: ReturnType<typeof createVegaStateRestorer>;
  externalUrl: IExternalUrl;
  renderMode: RenderMode;
  onError?: (error: string) => void;
  onSetDebugValues?: (debugValues: DebugValues) => void;
  onVegaFunction?: (intent: VegaFunctionIntent) => Promise<void>;
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
