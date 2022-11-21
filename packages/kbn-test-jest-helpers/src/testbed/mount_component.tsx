/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { ComponentType } from 'react';
import { Store } from 'redux';
import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';

import { mountWithIntl } from '../enzyme_helpers';
import { WithMemoryRouter, WithRoute } from '../router_helpers';
import { WithStore } from '../redux_helpers';
import { MemoryRouterConfig } from './types';

interface Config<T extends object = Record<string, any>> {
  Component: ComponentType<T>;
  memoryRouter: MemoryRouterConfig;
  store: Store | null;
  props: T;
  onRouter: (router: any) => void;
}

function getCompFromConfig<T extends object = Record<string, any>>({
  Component,
  memoryRouter,
  store,
  onRouter,
}: Config<T>): ComponentType<T> {
  const wrapWithRouter = memoryRouter.wrapComponent !== false;

  let Comp: ComponentType<T> = store !== null ? WithStore<T>(store)(Component) : Component;

  if (wrapWithRouter) {
    const { componentRoutePath, initialEntries, initialIndex } = memoryRouter!;

    // Wrap the componenet with a MemoryRouter and attach it to a react-router <Route />
    Comp = WithMemoryRouter(
      initialEntries,
      initialIndex
    )(WithRoute<T>(componentRoutePath, onRouter)(Comp));
  }

  return Comp;
}

export function mountComponentSync<T extends object = Record<string, any>>(
  config: Config<T>
): ReactWrapper {
  const Comp = getCompFromConfig<T>(config);
  return mountWithIntl(<Comp {...config.props} />);
}

export async function mountComponentAsync<T extends object = Record<string, any>>(
  config: Config<T>
): Promise<ReactWrapper> {
  const Comp = getCompFromConfig(config);

  let component: ReactWrapper;

  await act(async () => {
    component = mountWithIntl(<Comp {...config.props} />);
  });

  return component!.update();
}

export function getJSXComponentWithProps<T extends object = Record<string, any>>(
  Component: ComponentType<T>,
  props: T
) {
  return <Component {...props} />;
}
