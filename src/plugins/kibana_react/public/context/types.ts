/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC, PropsWithChildren } from 'react';
import { CoreStart } from '@kbn/core/public';
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
  Provider: FC<PropsWithChildren<{ services?: T }>>;
  Consumer: React.Consumer<KibanaReactContextValue<T>>;
}
