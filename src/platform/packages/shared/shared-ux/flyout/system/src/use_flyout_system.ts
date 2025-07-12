/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  useFlyoutSystemContext,
  FlyoutSystemOpenMainOptions,
  FlyoutSystemOpenChildOptions,
  FlyoutSystemApi,
} from './flyout_system_provider';

/**
 * Hook that provides API access to the FlyoutSystem
 *
 * @returns A set of methods to control the flyout system
 */
export const useFlyoutSystemApi = (): FlyoutSystemApi => {
  const { state, dispatch } = useFlyoutSystemContext();

  /**
   * Opens a main flyout with the provided content and options
   */
  const openFlyout = (options: FlyoutSystemOpenMainOptions) => {
    dispatch({ type: 'OPEN_MAIN_FLYOUT', payload: options });
  };

  /**
   * Opens a child flyout with the provided content and options
   * Will only work if there's already an open main flyout
   */
  const openChildFlyout = (options: FlyoutSystemOpenChildOptions) => {
    if (!state.activeFlyoutGroup || !state.activeFlyoutGroup.isMainOpen) {
      return;
    }
    dispatch({ type: 'OPEN_CHILD_FLYOUT', payload: options });
  };

  const closeChildFlyout = () => {
    dispatch({ type: 'CLOSE_CHILD_FLYOUT' });
  };

  const goBack = () => {
    dispatch({ type: 'GO_BACK' });
  };

  const closeSession = () => {
    dispatch({ type: 'CLOSE_SESSION' });
  };

  const isFlyoutOpen = state.activeFlyoutGroup !== null;
  const isChildFlyoutOpen = state.activeFlyoutGroup?.isChildOpen ?? false;
  const canGoBack = state.history.length > 0;

  return {
    openFlyout,
    openChildFlyout,
    closeChildFlyout,
    goBack,
    closeSession,
    isFlyoutOpen,
    isChildFlyoutOpen,
    canGoBack,
  };
};
