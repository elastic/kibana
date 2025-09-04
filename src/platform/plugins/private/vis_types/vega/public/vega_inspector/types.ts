/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IUiSettingsClient } from '@kbn/core/public';
import type { Adapters, RequestAdapter } from '@kbn/inspector-plugin/public';
import type { VegaAdapter } from './vega_adapter';

export interface VegaInspectorViewDependencies {
  uiSettings: IUiSettingsClient;
}

export interface VegaInspectorAdapters extends Adapters {
  requests: RequestAdapter;
  vega: VegaAdapter;
}
