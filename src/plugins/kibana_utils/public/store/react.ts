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
import { Provider as ReactReduxProvider, connect as reactReduxConnect } from 'react-redux';
import { Store } from 'redux';
import { AppStore } from './types';

// NOTE: Types in `react-redux` seem to be quite off compared to reality
// NOTE: that's why a lot of `any`s below.

export type MapStateToProps<State extends {}, Props extends {}> = (state: State) => Partial<Props>;

export interface ConsumerProps<State> {
  children: (state: State) => React.ReactChild;
}

const mapDispatchToProps = () => ({});
const mergeProps: any = (stateProps: any, dispatchProps: any, ownProps: any) => ({
  ...ownProps,
  ...stateProps,
  ...dispatchProps,
});

export const createContext = <State>({ redux }: AppStore<State>) => {
  const context = React.createContext<{ store: Store }>({ store: redux });

  const Provider: React.FC<{}> = ({ children }) =>
    React.createElement(ReactReduxProvider, {
      store: redux,
      context,
      children,
    } as any);

  const Consumer: React.FC<ConsumerProps<State>> = ({ children }) =>
    React.createElement(context.Consumer, {
      children: ({ store }) => children(store.getState()),
    });

  const options: any = { context };
  const connect = (mapStateToProps: MapStateToProps<State, any>) =>
    reactReduxConnect(mapStateToProps, mapDispatchToProps, mergeProps, options);

  return {
    Provider,
    Consumer,
    connect,
    context,
  };
};
