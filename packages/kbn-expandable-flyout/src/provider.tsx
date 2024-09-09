/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { createKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import React, { FC, PropsWithChildren, useEffect, useMemo } from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { ExpandableFlyoutContextProvider, useExpandableFlyoutContext } from './context';
import { FlyoutState } from './state';
import { useExpandableFlyoutState } from './hooks/use_expandable_flyout_state';
import { Context, selectNeedsSync, store, useDispatch, useSelector } from './redux';
import { urlChangedAction } from './actions';

/**
 * Dispatches actions when url state changes and initializes the state when the app is loaded with flyout url parameters
 */
export const UrlSynchronizer = () => {
  const { urlKey } = useExpandableFlyoutContext();
  const panels = useExpandableFlyoutState();
  const needsSync = useSelector(selectNeedsSync());
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
    if (!urlKey) {
      return;
    }

    const currentValue = urlStorage.get<FlyoutState>(urlKey);

    // Dispatch current value to redux store as it does not happen automatically
    if (currentValue) {
      dispatch(
        urlChangedAction({
          ...currentValue,
          preview: currentValue?.preview?.at(-1),
          id: urlKey,
        })
      );
    }

    const subscription = urlStorage.change$<FlyoutState>(urlKey).subscribe((value) => {
      dispatch(urlChangedAction({ ...value, preview: value?.preview?.at(-1), id: urlKey }));
    });

    return () => subscription.unsubscribe();
  }, [dispatch, urlKey, urlStorage]);

  useEffect(() => {
    if (!needsSync || !panels || !urlKey) {
      return;
    }

    const { left, right, preview } = panels;
    urlStorage.set(urlKey, { left, right, preview: [preview?.at(-1)] });
  }, [needsSync, panels, urlKey, urlStorage]);

  return null;
};

interface ExpandableFlyoutProviderProps {
  /**
   * Unique key to be used as url parameter to store the state of the flyout.
   * Providing this will save the state of the flyout in the url.
   * The word `memory` is reserved, do NOT use it!
   */
  urlKey?: string;
}

/**
 * Wrap your plugin with this context for the ExpandableFlyout React component.
 */
export const ExpandableFlyoutProvider: FC<PropsWithChildren<ExpandableFlyoutProviderProps>> = ({
  children,
  urlKey,
}) => {
  return (
    <ExpandableFlyoutContextProvider urlKey={urlKey}>
      <ReduxProvider context={Context} store={store}>
        {urlKey ? <UrlSynchronizer /> : null}
        {children}
      </ReduxProvider>
    </ExpandableFlyoutContextProvider>
  );
};
