/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useReducer } from 'react';
import {
  getExpandedSectionFromLocalStorage,
  setExpandedSectionToLocalStorage,
} from '../utils/local_storage';

const CLOSED = 'closed' as const;
const OPEN = 'open' as const;

type ToggleReducerState = typeof CLOSED | typeof OPEN;

export interface ToggleReducerAction {
  /**
   * storageKey to save value in specific flyout
   */
  localStorageKey: string | undefined;
  /**
   * title to save expanded value in local storage section
   */
  title: string | undefined;
}

/**
 * Reducer for toggling between expanded and collapsed states.
 * Every time the user takes an action, we store the new state in local storage. This allows to preserve the state when opening new flyouts or when refreshing the page.
 * The object stored is a map of section names to expanded boolean values.
 */
export const toggleReducer = (state: ToggleReducerState, action: ToggleReducerAction) => {
  const { localStorageKey, title } = action;

  if (localStorageKey && title) {
    const localStorage = getExpandedSectionFromLocalStorage(localStorageKey);
    setExpandedSectionToLocalStorage(localStorageKey, {
      ...localStorage,
      [title]: state !== OPEN,
    });
  }

  return state === CLOSED ? OPEN : CLOSED;
};

export interface UseAccordionStateValue {
  /**
   * Should children be rendered in the dom
   */
  renderContent: boolean;
  /**
   * Use this to control the accordion visual state
   */
  state: ToggleReducerState;
  /**
   * Handler function for cycling between the states
   */
  toggle: (args: { localStorageKey?: string; title?: string }) => void;
}

/**
 * Hook to control the state of the EuiAccordion. It will store the state in local storage if the localStorageKey is provided.
 * @param expandedInitially - is accordion expanded on first render
 */
export const useAccordionState = (expandedInitially: boolean): UseAccordionStateValue => {
  const initialState = expandedInitially ? OPEN : CLOSED;
  const [state, toggleState] = useReducer(toggleReducer, initialState);
  const renderContent = state === OPEN;

  const toggle = ({ localStorageKey, title }: { localStorageKey?: string; title?: string }) => {
    toggleState({ localStorageKey, title });
  };

  return { renderContent, state, toggle };
};
