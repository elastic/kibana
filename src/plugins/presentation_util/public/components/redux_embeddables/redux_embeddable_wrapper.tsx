/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Provider, TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import { SliceCaseReducers, PayloadAction, createSlice } from '@reduxjs/toolkit';
import React, { PropsWithChildren, useEffect, useMemo, useRef } from 'react';
import { Draft } from 'immer/dist/types/types-external';
import { debounceTime } from 'rxjs/operators';
import { isEqual } from 'lodash';

import {
  ReduxContainerContextServices,
  ReduxEmbeddableContextServices,
  ReduxEmbeddableWrapperProps,
} from './types';
import {
  IEmbeddable,
  EmbeddableInput,
  EmbeddableOutput,
  IContainer,
} from '../../../../embeddable/public';
import { getManagedEmbeddablesStore } from './generic_embeddable_store';
import { ReduxEmbeddableContext, useReduxEmbeddableContext } from './redux_embeddable_context';

const getDefaultProps = <InputType extends EmbeddableInput = EmbeddableInput>(): Required<
  Pick<ReduxEmbeddableWrapperProps<InputType>, 'diffInput'>
> => ({
  diffInput: (a, b) => {
    const differences: Partial<InputType> = {};
    const allKeys = [...Object.keys(a), ...Object.keys(b)] as Array<keyof InputType>;
    allKeys.forEach((key) => {
      if (!isEqual(a[key], b[key])) differences[key] = a[key];
    });
    return differences;
  },
});

const embeddableIsContainer = (
  embeddable: IEmbeddable<EmbeddableInput, EmbeddableOutput>
): embeddable is IContainer => embeddable.isContainer;

/**
 * Place this wrapper around the react component when rendering an embeddable to automatically set up
 * redux for use with the embeddable via the supplied reducers. Any child components can then use ReduxEmbeddableContext
 * or ReduxContainerContext to interface with the state of the embeddable.
 */
export const ReduxEmbeddableWrapper = <InputType extends EmbeddableInput = EmbeddableInput>(
  props: PropsWithChildren<ReduxEmbeddableWrapperProps<InputType>>
) => {
  const { embeddable, reducers, diffInput } = useMemo(
    () => ({ ...getDefaultProps<InputType>(), ...props }),
    [props]
  );

  const containerActions: ReduxContainerContextServices['containerActions'] | undefined =
    useMemo(() => {
      if (embeddableIsContainer(embeddable)) {
        return {
          untilEmbeddableLoaded: embeddable.untilEmbeddableLoaded.bind(embeddable),
          updateInputForChild: embeddable.updateInputForChild.bind(embeddable),
          removeEmbeddable: embeddable.removeEmbeddable.bind(embeddable),
          addNewEmbeddable: embeddable.addNewEmbeddable.bind(embeddable),
        };
      }
      return;
    }, [embeddable]);

  const reduxEmbeddableContext: ReduxEmbeddableContextServices | ReduxContainerContextServices =
    useMemo(() => {
      const key = `${embeddable.type}_${embeddable.id}`;

      // A generic reducer used to update redux state when the embeddable input changes
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
        containerActions,
      };
    }, [reducers, embeddable, containerActions]);

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

/**
 * This component uses the context from the embeddable wrapper to set up a generic two-way binding between the embeddable input and
 * the redux store. a custom diffInput function can be provided, this function should always prioritize input A over input B.
 */
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

  useEffect(() => {
    // When Embeddable Input changes, push differences to redux.
    const inputSubscription = embeddable
      .getInput$()
      // .pipe(debounceTime(0)) // debounce input changes to ensure that when many updates are made in one render the latest wins out
      .subscribe(() => {
        const differences = diffInput(embeddable.getInput(), stateRef.current);
        if (differences && Object.keys(differences).length > 0) {
          dispatch(updateEmbeddableReduxState(differences));
        }
      });
    return () => inputSubscription.unsubscribe();
  }, [diffInput, dispatch, embeddable, updateEmbeddableReduxState]);

  useEffect(() => {
    // When redux state changes, push differences to Embeddable Input.
    stateRef.current = currentState;
    const differences = diffInput(currentState, embeddable.getInput());
    if (differences && Object.keys(differences).length > 0) {
      embeddable.updateInput(differences);
    }
  }, [currentState, diffInput, embeddable]);

  return <>{children}</>;
};
