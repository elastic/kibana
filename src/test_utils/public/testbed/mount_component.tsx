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

import React, { ComponentType } from 'react';
import { Store } from 'redux';
import { ReactWrapper } from 'enzyme';
import { act } from 'react-dom/test-utils';

import { mountWithIntl } from '../enzyme_helpers';
import { WithMemoryRouter, WithRoute, WithStore } from '../helpers';
import { MemoryRouterConfig } from './types';

interface Config {
  Component: ComponentType;
  memoryRouter: MemoryRouterConfig;
  store: Store | null;
  props: any;
  onRouter: (router: any) => void;
}

const getCompFromConfig = ({ Component, memoryRouter, store, onRouter }: Config): ComponentType => {
  const wrapWithRouter = memoryRouter.wrapComponent !== false;

  let Comp: ComponentType = store !== null ? WithStore(store)(Component) : Component;

  if (wrapWithRouter) {
    const { componentRoutePath, initialEntries, initialIndex } = memoryRouter!;

    // Wrap the componenet with a MemoryRouter and attach it to a react-router <Route />
    Comp = WithMemoryRouter(
      initialEntries,
      initialIndex
    )(WithRoute(componentRoutePath, onRouter)(Comp));
  }

  return Comp;
};

export const mountComponentSync = (config: Config): ReactWrapper => {
  const Comp = getCompFromConfig(config);
  return mountWithIntl(<Comp {...config.props} />);
};

export const mountComponentAsync = async (config: Config): Promise<ReactWrapper> => {
  const Comp = getCompFromConfig(config);

  let component: ReactWrapper;

  await act(async () => {
    component = mountWithIntl(<Comp {...config.props} />);
  });

  // @ts-ignore
  return component.update();
};

export const getJSXComponentWithProps = (Component: ComponentType, props: any) => (
  <Component {...props} />
);
