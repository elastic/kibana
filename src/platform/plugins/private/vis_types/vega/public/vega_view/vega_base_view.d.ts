/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IExternalUrl } from '@kbn/core/public';
import type { View } from 'vega';
import type { IServiceSettings } from './vega_map_view/service_settings/service_settings_types';
import type { VegaRenderDescriptor } from '../data_model/types';
import type { VegaFilterActionHandler } from '../types';
import type { createVegaStateRestorer } from '../lib/vega_state_restorer';

interface VegaViewParams {
  parentEl: HTMLDivElement;
  descriptor: VegaRenderDescriptor;
  /** Receives every error the view displays, so the parent can surface it (e.g. in the inspector). */
  onError: (message: string) => void;
  /** Receives the live Vega view once it is created, so the parent can inspect its data and signals. */
  onViewCreated: (view: View) => void;
  onFilterAction: VegaFilterActionHandler;
  serviceSettings: IServiceSettings;
  vegaStateRestorer: ReturnType<typeof createVegaStateRestorer>;
  externalUrl: IExternalUrl;
  showWarnings: boolean;
}

export class VegaBaseView {
  constructor(params: VegaViewParams);
  init(): Promise<void>;
  onError(error: any): void;
  onWarn(error: any): void;
  setView(map: any): void;
  _addDestroyHandler(handler: Function): void;

  destroy(): Promise<void>;
  resize(dimensions?: { height: number; width: number }): Promise<void>;

  _container: HTMLDivElement;
  _controls: HTMLDivElement;
  _descriptor: VegaRenderDescriptor;
  _onViewCreated: VegaViewParams['onViewCreated'];
  _vegaViewConfig: any;
  _serviceSettings: VegaViewParams['serviceSettings'];
  _vegaStateRestorer: VegaViewParams['vegaStateRestorer'];
}
