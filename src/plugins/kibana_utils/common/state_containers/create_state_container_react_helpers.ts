/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import useObservable from 'react-use/lib/useObservable';
import defaultComparator from 'fast-deep-equal';
import { Comparator, Connect, StateContainer, UnboxState } from './types';

const { useContext, useLayoutEffect, useRef, createElement: h } = React;

/**
 * React hooks that returns the latest state of a {@link StateContainer}.
 *
 * @param container - {@link StateContainer} which state to track.
 * @returns - latest {@link StateContainer} state
 * @public
 */
export const useContainerState = <Container extends StateContainer<any, any>>(
  container: Container
): UnboxState<Container> => useObservable(container.state$, container.get());

/**
 * React hook to apply selector to state container to extract only needed information. Will
 * re-render your component only when the section changes.
 *
 * @param container - {@link StateContainer} which state to track.
 * @param selector - Function used to pick parts of state.
 * @param comparator - {@link Comparator} function used to memoize previous result, to not
 *    re-render React component if state did not change. By default uses
 *    `fast-deep-equal` package.
 * @returns - result of a selector(state)
 * @public
 */
export const useContainerSelector = <Container extends StateContainer<any, any>, Result>(
  container: Container,
  selector: (state: UnboxState<Container>) => Result,
  comparator: Comparator<Result> = defaultComparator
): Result => {
  const { state$, get } = container;
  const lastValueRef = useRef<Result>(get());
  const [value, setValue] = React.useState<Result>(() => {
    const newValue = selector(get());
    lastValueRef.current = newValue;
    return newValue;
  });
  useLayoutEffect(() => {
    const subscription = state$.subscribe((currentState: UnboxState<Container>) => {
      const newValue = selector(currentState);
      if (!comparator(lastValueRef.current, newValue)) {
        lastValueRef.current = newValue;
        setValue(newValue);
      }
    });
    return () => subscription.unsubscribe();
  }, [state$, comparator]);
  return value;
};

/**
 * Creates helpers for using {@link StateContainer | State Containers} with react
 * Refer to {@link https://github.com/elastic/kibana/blob/master/src/plugins/kibana_utils/docs/state_containers/react.md | guide} for details
 * @public
 */
export const createStateContainerReactHelpers = <Container extends StateContainer<any, any>>() => {
  const context = React.createContext<Container>(null as any);

  const useContainer = (): Container => useContext(context);

  const useState = (): UnboxState<Container> => {
    const container = useContainer();
    return useContainerState(container);
  };

  const useTransitions: () => Container['transitions'] = () => useContainer().transitions;

  const useSelector = <Result>(
    selector: (state: UnboxState<Container>) => Result,
    comparator: Comparator<Result> = defaultComparator
  ): Result => {
    const container = useContainer();
    return useContainerSelector<Container, Result>(container, selector, comparator);
  };

  const connect: Connect<UnboxState<Container>> = (mapStateToProp) => (component) => (props) =>
    h(component, { ...useSelector(mapStateToProp), ...props } as any);

  return {
    Provider: context.Provider,
    Consumer: context.Consumer,
    context,
    useContainer,
    useState,
    useTransitions,
    useSelector,
    connect,
  };
};
