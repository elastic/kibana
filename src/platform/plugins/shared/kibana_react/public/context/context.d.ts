/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC, PropsWithChildren } from 'react';
import type React from 'react';
import type { KibanaReactContext, KibanaReactContextValue, KibanaServices } from './types';
export declare const context: React.Context<
  KibanaReactContextValue<Partial<import('@kbn/core/public').CoreStart>>
>;
export declare const useKibana: <Extra extends object = {}>() => KibanaReactContextValue<
  KibanaServices & Extra
>;
export declare const withKibana: <
  Props extends {
    kibana: KibanaReactContextValue<{}>;
  }
>(
  type: React.ComponentType<Props>
) => FC<Omit<Props, 'kibana'>>;
export declare const createKibanaReactContext: <Services extends KibanaServices>(
  services: Services
) => KibanaReactContext<Services>;
export declare const KibanaContextProvider: FC<
  PropsWithChildren<{
    services?: {} | undefined;
  }>
>;
