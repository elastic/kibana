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
import { AppStore, Mutators, PureMutators } from './types';
// TODO: Below import is temporary, use `react-use` lib instead.
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { useObservable } from '../../../kibana_react/public/util/use_observable';

/**
 * @note
 * Types in `react-redux` seem to be quite off compared to reality
 * that's why a lot of `any`s below.
 */

export interface ConsumerProps<State> {
  children: (state: State) => React.ReactChild;
}

export type MapStateToProps<State extends {}, StateProps extends {}> = (state: State) => StateProps;

// TODO: `Omit` is generally part of TypeScript, but it currently does not exist in our build.
type Omit<T, K extends keyof any> = Pick<T, Exclude<keyof T, K>>;
export type Connect<State extends {}> = <Props extends {}, StatePropKeys extends keyof Props>(
  mapStateToProp: MapStateToProps<State, Pick<Props, StatePropKeys>>
) => (component: React.ComponentType<Props>) => React.FC<Omit<Props, StatePropKeys>>;

interface ReduxContextValue {
  store: Store;
}

const mapDispatchToProps = () => ({});
const mergeProps: any = (stateProps: any, dispatchProps: any, ownProps: any) => ({
  ...ownProps,
  ...stateProps,
  ...dispatchProps,
});

export const createContext = <
  State extends {},
  StateMutators extends Mutators<PureMutators<State>> = {}
>(
  store: AppStore<State, StateMutators>
) => {
  const { redux } = store;
  (redux as any).__appStore = store;
  const context = React.createContext<ReduxContextValue>({ store: redux });

  const Provider: React.FC<{}> = ({ children }) =>
    React.createElement(ReactReduxProvider, {
      store: redux,
      context,
      children,
    } as any);

  const Consumer: React.FC<ConsumerProps<State>> = ({ children }) =>
    React.createElement(context.Consumer, {
      // eslint-disable-next-line no-shadow
      children: ({ store }: ReduxContextValue) => children(store.getState()),
    });

  const options: any = { context };
  const connect: Connect<State> = mapStateToProps =>
    reactReduxConnect(mapStateToProps, mapDispatchToProps, mergeProps, options) as any;

  /**
   * @todo
   *
   * - [x] `useStore`
   * - [x] `useState`
   * - [ ] `useSelector`
   * - [x] `useMutators`
   */

  const useStore = (): AppStore<State, StateMutators> => {
    // eslint-disable-next-line no-shadow
    const { store } = React.useContext(context);
    return (store as any).__appStore;
  };

  const useState = (): State => {
    // eslint-disable-next-line no-shadow
    const store = useStore();
    const state = useObservable(store.state$, store.get());
    return state;
  };

  const useMutators = (): StateMutators => useStore().mutators;

  return {
    Provider,
    Consumer,
    connect,
    context,
    useStore,
    useState,
    useMutators,
  };
};
