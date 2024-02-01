/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import React, { FC, PropsWithChildren, useEffect, useMemo } from 'react';
import { Provider as ReduxProvider } from 'react-redux';

import { useHistory } from 'react-router-dom';
import { State } from './state';
import { useExpandableFlyoutState } from './hooks/use_expandable_flyout_state';
import { EXPANDABLE_FLYOUT_URL_KEY } from './constants';
import { Context, store, useDispatch } from './redux';
import { urlChangedAction } from './actions';

export type ExpandableFlyoutStorageMode = 'memory' | 'url';

/**
 * Dispatches actions when url state changes and initializes the state when the app is loaded with flyout url parameters
 */
const UrlSynchronizer = () => {
  const state = useExpandableFlyoutState();
  const dispatch = useDispatch();

  const history = useHistory();

  const urlStorage = useMemo(
    () =>
      createKbnUrlStateStorage({
        history,
        useHash: false,
        useHashQuery: false,
      }),
    [history]
  );

  useEffect(() => {
    const currentValue = urlStorage.get<State>(EXPANDABLE_FLYOUT_URL_KEY);

    // Dispatch current value to redux store as it does not happen automatically
    if (currentValue) {
      dispatch(urlChangedAction({ ...currentValue, preview: currentValue?.preview[0] }));
    }

    const subscription = urlStorage.change$<State>(EXPANDABLE_FLYOUT_URL_KEY).subscribe((value) => {
      dispatch(urlChangedAction({ ...value, preview: value?.preview?.[0] }));
    });

    return () => subscription.unsubscribe();
  }, [dispatch, urlStorage]);

  useEffect(() => {
    const { needsSync, ...stateToSync } = state;

    if (needsSync) {
      urlStorage.set(EXPANDABLE_FLYOUT_URL_KEY, stateToSync);
    }
  }, [urlStorage, state]);

  return null;
};

interface ExpandableFlyoutProviderProps {
  /**
   * This allows the user to choose how the flyout storage is handled.
   * Url storage syncs current values straight to the browser query string.
   */
  storage?: ExpandableFlyoutStorageMode;
}

/**
 * Wrap your plugin with this context for the ExpandableFlyout React component.
 * Storage property allows you to specify how the flyout state works internally.
 * With "url", it will be persisted into url and thus allow for deep linking & will survive webpage reloads.
 * "memory" is based on an isolated redux context. The state is saved internally to the package, which means it will not be
 * persisted when sharing url or reloading browser pages.
 */
export const ExpandableFlyoutProvider: FC<PropsWithChildren<ExpandableFlyoutProviderProps>> = ({
  children,
  storage = 'url',
}) => {
  return (
    <ReduxProvider context={Context} store={store}>
      <>
        {storage === 'url' ? <UrlSynchronizer /> : null}
        {children}
      </>
    </ReduxProvider>
  );
};
