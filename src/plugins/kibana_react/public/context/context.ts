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
import { KibanaReactContext, KibanaReactContextValue, KibanaServices } from './types';
import { createReactOverlays } from '../overlays';
import { createNotifications } from '../notifications';

const defaultContextValue = {
  services: {},
  overlays: undefined,
  notifications: undefined,
};

export const context = React.createContext<KibanaReactContextValue<KibanaServices>>(
  defaultContextValue
);

export const useKibana = <Extra extends object = {}>(): KibanaReactContextValue<
  KibanaServices & Extra
> =>
  React.useContext((context as unknown) as React.Context<
    KibanaReactContextValue<KibanaServices & Extra>
  >);

export const createContext = <Services extends KibanaServices>(
  services: Services
): KibanaReactContext<Services> => {
  const overlays = services.overlays ? createReactOverlays(services) : undefined;
  const notifications = services.notifications ? createNotifications(services) : undefined;

  const value: KibanaReactContextValue<Services> = {
    services,
    overlays,
    notifications,
  } as KibanaReactContextValue<Services>;

  const Provider: React.FC<{}> = ({ children }) =>
    React.createElement(context.Provider as React.ComponentType<any>, { value, children });

  return {
    ...value,
    Provider,
    Consumer: (context.Consumer as unknown) as React.Consumer<KibanaReactContextValue<Services>>,
  };
};

export const withKibana = <Props extends { kibana: KibanaReactContextValue<any> }>(
  type: React.ComponentType<Props>
): React.FC<Omit<Props, 'kibana'>> => {
  const enhancedType: React.FC<Omit<Props, 'kibana'>> = (props: Omit<Props, 'kibana'>) => {
    const kibana = useKibana();
    return React.createElement(type, { ...props, kibana } as Props);
  };
  return enhancedType;
};
