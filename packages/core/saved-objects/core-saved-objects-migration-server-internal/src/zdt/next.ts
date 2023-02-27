/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { AllActionStates, InitState, State } from './state';
import type { MigratorContext } from './context';
import * as Actions from './actions';

export type ActionMap = ReturnType<typeof nextActionMap>;

/**
 * The response type of the provided control state's action.
 *
 * E.g. given 'INIT', provides the response type of the action triggered by
 * `next` in the 'INIT' control state.
 */
export type ResponseType<ControlState extends AllActionStates> = Awaited<
  ReturnType<ReturnType<ActionMap[ControlState]>>
>;

export const nextActionMap = (context: MigratorContext) => {
  return {
    INIT: (state: InitState) =>
      Actions.init({ client: context.elasticsearchClient, indices: [context.indexPrefix] }),
  };
};

export const next = (context: MigratorContext) => {
  const map = nextActionMap(context);

  return (state: State) => {
    const delay = <F extends (...args: any) => any>(fn: F): (() => ReturnType<F>) => {
      return () => {
        return state.retryDelay > 0
          ? new Promise((resolve) => setTimeout(resolve, state.retryDelay)).then(fn)
          : fn();
      };
    };

    if (state.controlState === 'DONE' || state.controlState === 'FATAL') {
      // Return null if we're in one of the terminating states
      return null;
    } else {
      // Otherwise return the delayed action
      // We use an explicit cast as otherwise TS infers `(state: never) => ...`
      // here because state is inferred to be the intersection of all states
      // instead of the union.
      const nextAction = map[state.controlState] as (
        state: State
      ) => ReturnType<typeof map[AllActionStates]>;
      return delay(nextAction(state));
    }
  };
};
