/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { createContext, PropsWithChildren, useContext, useEffect } from 'react';
import {
  AnyAction,
  Dispatch,
  CaseReducer,
  createSlice,
  PayloadAction,
  SliceCaseReducers,
  ActionCreatorWithPayload,
} from '@reduxjs/toolkit';
import { Provider, TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { useMemo } from 'react';
import { isEqual } from 'lodash';

import {
  EmbeddableInput,
  EmbeddableOutput,
  IEmbeddable,
} from '../../../../../../embeddable/public';
import { getManagedEmbeddablesStore } from './generic_embeddable_store';

export interface GenericEmbeddableReducers<InputType> {
  // any is strategic here because we want to allow payloads of any shape in generic reducers
  [key: string]: CaseReducer<InputType, PayloadAction<any>>;
}

export interface ReduxEmbeddableWrapperProps<InputType extends EmbeddableInput = EmbeddableInput> {
  embeddable: IEmbeddable<InputType, EmbeddableOutput>;
  reducers: GenericEmbeddableReducers<InputType>;
  diffInput?: (a: InputType, b: InputType) => Partial<InputType>;
}

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

/**
 * This context allows components underneath the redux embeddable wrapper to get access to the actions, selector, and dispatch.
 */
interface ReduxEmbeddableContextServices<
  InputType extends EmbeddableInput = EmbeddableInput,
  ReducerType extends GenericEmbeddableReducers<InputType> = GenericEmbeddableReducers<InputType>
> {
  actions: {
    [Property in keyof ReducerType]: ActionCreatorWithPayload<
      Parameters<ReducerType[Property]>[1]['payload']
    >;
  };
  useEmbeddableSelector: TypedUseSelectorHook<InputType>;
  useEmbeddableDispatch: () => Dispatch<AnyAction>;
}

const ReduxEmbeddableContext =
  createContext<ReduxEmbeddableContextServices<EmbeddableInput> | null>(null); // generic EmbeddableInput as placeholder

export const useReduxEmbeddableContext = <
  InputType extends EmbeddableInput = EmbeddableInput,
  ReducerType extends GenericEmbeddableReducers<InputType> = GenericEmbeddableReducers<InputType>
>() => {
  const context = useContext<ReduxEmbeddableContextServices<InputType, ReducerType>>(
    ReduxEmbeddableContext as unknown as React.Context<
      ReduxEmbeddableContextServices<InputType, ReducerType> // cast context from EmbeddableInput back to passed in generic
    >
  );

  if (context == null) {
    throw new Error('useServicesContext must be used inside the ServicesContextProvider.');
  }
  return context!;
};

export const ReduxEmbeddableWrapper = <InputType extends EmbeddableInput = EmbeddableInput>(
  props: PropsWithChildren<ReduxEmbeddableWrapperProps<InputType>>
) => {
  const { embeddable, reducers, diffInput } = useMemo(
    () => ({ ...getDefaultProps<InputType>(), ...props }),
    [props]
  );

  const reduxEmbeddableContext = useMemo(() => {
    const key = `${embeddable.type}_${embeddable.id}`;
    const slice = createSlice<InputType, SliceCaseReducers<InputType>>({
      initialState: embeddable.getInput(),
      name: key,
      reducers,
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
      actions: slice.actions,
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
  const { useEmbeddableSelector } = useReduxEmbeddableContext<InputType>();

  const currentState = useEmbeddableSelector((state) => state);

  useEffect(() => {
    const differences = diffInput(currentState, embeddable.getInput());
    embeddable.updateInput(differences);
  }, [currentState, diffInput, embeddable]);

  return <>{children}</>;
};
