/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import * as React from 'react';
import { CoreStart } from '../../../../core/public';
import { KibanaReactOverlays } from '../overlays';
import { KibanaReactNotifications } from '../notifications';

export type KibanaServices = Partial<CoreStart>;

export interface KibanaReactContextValue<Services extends KibanaServices> {
  readonly services: Services;
  readonly overlays: KibanaReactOverlays;
  readonly notifications: KibanaReactNotifications;
}

export interface KibanaReactContext<T extends KibanaServices> {
  value: KibanaReactContextValue<T>;
  Provider: React.FC<{ services?: T }>;
  Consumer: React.Consumer<KibanaReactContextValue<T>>;
}
