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
  embeddable: IEmbeddable<ReduxEmbeddableStateType['input'], ReduxEmbeddableStateType['output']>;
  actions: ReduxEmbeddableContext<ReduxEmbeddableStateType>['actions'];
}) => {
  if (settings?.disableSync) {
    return;
  }

  const { isInputEqual: inputEqualityCheck, isOutputEqual: outputEqualityCheck } = settings ?? {};
  const inputEqual = (
    inputA: ReduxEmbeddableStateType['input'],
    inputB: ReduxEmbeddableStateType['input']
  ) => (inputEqualityCheck ? inputEqualityCheck(inputA, inputB) : deepEqual(inputA, inputB));
  const outputEqual = (
    outputA: ReduxEmbeddableStateType['output'],
    outputB: ReduxEmbeddableStateType['output']
  ) => (outputEqualityCheck ? outputEqualityCheck(outputA, outputB) : deepEqual(outputA, outputB));

  // when the redux store changes, diff, and push updates to the embeddable input or to the output.
  const unsubscribeFromStore = store.subscribe(() => {
    const reduxState = store.getState();
    if (!inputEqual(reduxState.input, embeddable.getInput())) {
      embeddable.updateInput(reduxState.input);
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
  });

  // when the embeddable input changes, diff and dispatch to the redux store
  const inputSubscription = embeddable.getInput$().subscribe((embeddableInput) => {
    const reduxState = store.getState();
    if (!inputEqual(reduxState.input, embeddableInput)) {
      store.dispatch(actions.updateEmbeddableReduxInput(embeddableInput));
    }
  });

  // when the embeddable output changes, diff and dispatch to the redux store
  const outputSubscription = embeddable.getOutput$().subscribe((embeddableOutput) => {
    const reduxState = store.getState();
    if (!outputEqual(reduxState.output, embeddableOutput)) {
      store.dispatch(actions.updateEmbeddableReduxOutput(embeddableOutput));
    }
  });
  return () => {
    unsubscribeFromStore();
    inputSubscription.unsubscribe();
    outputSubscription.unsubscribe();
  };
};
