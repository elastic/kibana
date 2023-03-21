/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import deepEqual from 'fast-deep-equal';

import { IEmbeddable } from '@kbn/embeddable-plugin/public';
import { EnhancedStore } from '@reduxjs/toolkit';
import { ReduxEmbeddableContext, ReduxEmbeddableState, ReduxEmbeddableSyncSettings } from './types';
import { cleanInputForRedux } from './clean_redux_embeddable_state';

type Writeable<T> = { -readonly [P in keyof T]: T[P] };

export const syncReduxEmbeddable = <
  ReduxEmbeddableStateType extends ReduxEmbeddableState = ReduxEmbeddableState
>({
  store,
  actions,
  settings,
  embeddable,
}: {
  settings?: ReduxEmbeddableSyncSettings;
  store: EnhancedStore<ReduxEmbeddableStateType>;
  embeddable: IEmbeddable<
    ReduxEmbeddableStateType['explicitInput'],
    ReduxEmbeddableStateType['output']
  >;
  actions: ReduxEmbeddableContext<ReduxEmbeddableStateType>['actions'];
}) => {
  if (settings?.disableSync) {
    return;
  }

  let embeddableToReduxInProgress = false;
  let reduxToEmbeddableInProgress = false;

  const { isInputEqual: inputEqualityCheck, isOutputEqual: outputEqualityCheck } = settings ?? {};
  const inputEqual = (
    inputA: Partial<ReduxEmbeddableStateType['explicitInput']>,
    inputB: Partial<ReduxEmbeddableStateType['explicitInput']>
  ) => (inputEqualityCheck ? inputEqualityCheck(inputA, inputB) : deepEqual(inputA, inputB));
  const outputEqual = (
    outputA: ReduxEmbeddableStateType['output'],
    outputB: ReduxEmbeddableStateType['output']
  ) => (outputEqualityCheck ? outputEqualityCheck(outputA, outputB) : deepEqual(outputA, outputB));

  // when the redux store changes, diff, and push updates to the embeddable input or to the output.
  const unsubscribeFromStore = store.subscribe(() => {
    if (embeddableToReduxInProgress) return;
    reduxToEmbeddableInProgress = true;
    const reduxState = store.getState();
    if (!inputEqual(reduxState.explicitInput, embeddable.getExplicitInput())) {
      embeddable.updateInput(reduxState.explicitInput);
    }
    if (!outputEqual(reduxState.output, embeddable.getOutput())) {
      // updating output is usually not accessible from outside of the embeddable.
      // This redux sync utility is meant to be used from inside the embeddable, so we need to workaround the typescript error via casting.
      (
        embeddable as unknown as {
          updateOutput: (newOutput: ReduxEmbeddableStateType['output']) => void;
        }
      ).updateOutput(reduxState.output);
    }
    reduxToEmbeddableInProgress = false;
  });

  // when the embeddable input changes, diff and dispatch to the redux store
  const inputSubscription = embeddable.getInput$().subscribe(() => {
    if (reduxToEmbeddableInProgress) return;
    embeddableToReduxInProgress = true;
    const { explicitInput: reduxExplicitInput } = store.getState();

    // store only explicit input in the store
    const embeddableExplictInput = embeddable.getExplicitInput() as Writeable<
      ReduxEmbeddableStateType['explicitInput']
    >;

    if (!inputEqual(reduxExplicitInput, embeddableExplictInput)) {
      store.dispatch(
        actions.replaceEmbeddableReduxInput(cleanInputForRedux(embeddableExplictInput))
      );
    }
    embeddableToReduxInProgress = false;
  });

  // when the embeddable output changes, diff and dispatch to the redux store
  const outputSubscription = embeddable.getOutput$().subscribe((embeddableOutput) => {
    if (reduxToEmbeddableInProgress) return;
    embeddableToReduxInProgress = true;
    const reduxState = store.getState();
    if (!outputEqual(reduxState.output, embeddableOutput)) {
      store.dispatch(actions.replaceEmbeddableReduxOutput(embeddableOutput));
    }
    embeddableToReduxInProgress = false;
  });
  return () => {
    unsubscribeFromStore();
    inputSubscription.unsubscribe();
    outputSubscription.unsubscribe();
  };
};
