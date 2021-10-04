/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { PropsWithChildren, useEffect, useMemo, useRef } from 'react';
import { Provider, TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { Draft } from 'immer/dist/types/types-external';
import { isEqual } from 'lodash';
import { SliceCaseReducers, PayloadAction, createSlice } from '@reduxjs/toolkit';

import { IEmbeddable, EmbeddableInput, EmbeddableOutput } from '../../../../embeddable/public';
import { getManagedEmbeddablesStore } from './generic_embeddable_store';
import { ReduxEmbeddableContextServices, ReduxEmbeddableWrapperProps } from './types';
import { ReduxEmbeddableContext, useReduxEmbeddableContext } from './redux_embeddable_context';

const getDefaultProps = <InputType extends EmbeddableInput = EmbeddableInput>(): Required<
  Pick<ReduxEmbeddableWrapperProps<InputType>, 'diffInput'>
> => ({
  diffInput: (a, b) => {
    const differences: Partial<InputType> = {};
    const allKeys = [...Object.keys(a), Object.keys(b)] as Array<keyof InputType>;
    allKeys.forEach((key) => {
      if (!isEqual(a[key], b[key])) differences[key] = a[key];
    });
    return differences;
  },
});

export const ReduxEmbeddableWrapper = <InputType extends EmbeddableInput = EmbeddableInput>(
  props: PropsWithChildren<ReduxEmbeddableWrapperProps<InputType>>
) => {
  const { embeddable, reducers, diffInput } = useMemo(
    () => ({ ...getDefaultProps<InputType>(), ...props }),
    [props]
  );

  const reduxEmbeddableContext = useMemo(() => {
    const key = `${embeddable.type}_${embeddable.id}`;
    const updateEmbeddableReduxState = (
      state: Draft<InputType>,
      action: PayloadAction<Partial<InputType>>
    ) => {
      return { ...state, ...action.payload };
    };

    const slice = createSlice<InputType, SliceCaseReducers<InputType>>({
      initialState: embeddable.getInput(),
      name: key,
      reducers: { ...reducers, updateEmbeddableReduxState },
    });
    const store = getManagedEmbeddablesStore();

    store.injectReducer({
      key,
      asyncReducer: slice.reducer,
    });

    const useEmbeddableSelector: TypedUseSelectorHook<InputType> = () =>
      useSelector((state: ReturnType<typeof store.getState>) => state[key]);

    return {
      useEmbeddableDispatch: () => useDispatch<typeof store.dispatch>(),
      useEmbeddableSelector,
      actions: slice.actions as ReduxEmbeddableContextServices['actions'],
    };
  }, [reducers, embeddable]);

  return (
    <Provider store={getManagedEmbeddablesStore()}>
      <ReduxEmbeddableContext.Provider value={reduxEmbeddableContext}>
        <ReduxEmbeddableSync diffInput={diffInput} embeddable={embeddable}>
          {props.children}
        </ReduxEmbeddableSync>
      </ReduxEmbeddableContext.Provider>
    </Provider>
  );
};

interface ReduxEmbeddableSyncProps<InputType extends EmbeddableInput = EmbeddableInput> {
  diffInput: (a: InputType, b: InputType) => Partial<InputType>;
  embeddable: IEmbeddable<InputType, EmbeddableOutput>;
}

const ReduxEmbeddableSync = <InputType extends EmbeddableInput = EmbeddableInput>({
  embeddable,
  diffInput,
  children,
}: PropsWithChildren<ReduxEmbeddableSyncProps<InputType>>) => {
  const {
    useEmbeddableSelector,
    useEmbeddableDispatch,
    actions: { updateEmbeddableReduxState },
  } = useReduxEmbeddableContext<InputType>();

  const dispatch = useEmbeddableDispatch();
  const currentState = useEmbeddableSelector((state) => state);
  const stateRef = useRef(currentState);

  // When Embeddable Input changes, push differences to redux.
  useEffect(() => {
    embeddable.getInput$().subscribe(() => {
      const differences = diffInput(embeddable.getInput(), stateRef.current);
      if (differences && Object.keys(differences).length > 0) {
        dispatch(updateEmbeddableReduxState(differences));
      }
    });
  }, [diffInput, dispatch, embeddable, updateEmbeddableReduxState]);

  // When redux state changes, push differences to Embeddable Input.
  useEffect(() => {
    stateRef.current = currentState;
    const differences = diffInput(currentState, embeddable.getInput());
    if (differences && Object.keys(differences).length > 0) {
      embeddable.updateInput(differences);
    }
  }, [currentState, diffInput, embeddable]);

  return <>{children}</>;
};
