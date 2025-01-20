/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { FC, PropsWithChildren } from 'react';
import { KibanaReactContext, KibanaReactContextValue, KibanaServices } from './types';
import { createReactOverlays } from '../overlays';
import { createNotifications } from '../notifications';

const { useMemo, useContext, createElement, createContext } = React;

const defaultContextValue = {
  services: {},
  overlays: createReactOverlays({}),
  notifications: createNotifications({}),
};

export const context = createContext<KibanaReactContextValue<KibanaServices>>(defaultContextValue);

export const useKibana = <Extra extends object = {}>(): KibanaReactContextValue<
  KibanaServices & Extra
> =>
  useContext(context as unknown as React.Context<KibanaReactContextValue<KibanaServices & Extra>>);

export const withKibana = <Props extends { kibana: KibanaReactContextValue<{}> }>(
  type: React.ComponentType<Props>
): FC<Omit<Props, 'kibana'>> => {
  const EnhancedType: FC<Omit<Props, 'kibana'>> = (props: Omit<Props, 'kibana'>) => {
    const kibana = useKibana();
    return React.createElement(type, { ...props, kibana } as Props);
  };
  return EnhancedType;
};

export const createKibanaReactContext = <Services extends KibanaServices>(
  services: Services
): KibanaReactContext<Services> => {
  const value: KibanaReactContextValue<Services> = {
    services,
    overlays: createReactOverlays(services),
    notifications: createNotifications(services),
  };

  const Provider: FC<PropsWithChildren<{ services?: Services }>> = ({
    services: newServices = {},
    children,
  }) => {
    const oldValue = useKibana();
    const { value: newValue } = useMemo(
      () => createKibanaReactContext({ ...services, ...oldValue.services, ...newServices }),
      [services, oldValue, newServices]
    );

    const newProvider = createElement(context.Provider, {
      value: newValue,
      children,
    });

    return newProvider;
  };

  return {
    value,
    Provider,
    Consumer: context.Consumer as unknown as React.Consumer<KibanaReactContextValue<Services>>,
  };
};

export const { Provider: KibanaContextProvider } = createKibanaReactContext({});
