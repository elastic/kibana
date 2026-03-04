/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FC, ReactNode } from 'react';
import React, { useEffect } from 'react';
import { AppMenu } from '@kbn/core-chrome-app-menu';
import { internalStateActions, useInternalStateDispatch } from '../../state_management/redux';
import { TabsBarVisibility } from '../../state_management/redux/types';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import type { DiscoverCustomizationContext } from '../../../../customizations';

export const HideTabsBar: FC<{
  customizationContext: DiscoverCustomizationContext;
  children: ReactNode;
}> = ({ customizationContext, children }) => {
  const dispatch = useInternalStateDispatch();
  const { chrome, setHeaderActionMenu } = useDiscoverServices();

  useEffect(() => {
    dispatch(internalStateActions.setTabsBarVisibility(TabsBarVisibility.hidden));
    return () => {
      dispatch(internalStateActions.setTabsBarVisibility(TabsBarVisibility.default));
    };
  }, [dispatch]);

  // When standalone, clear the chrome app menu bar and legacy action slot so only app content shows
  useEffect(() => {
    if (customizationContext.displayMode !== 'standalone') {
      return;
    }
    setHeaderActionMenu(undefined);
  }, [customizationContext.displayMode, setHeaderActionMenu]);

  return (
    <>
      {
        /**
         * The tabs bar renders the app menu, but it still needs to be shown when tabs are hidden
         */
        customizationContext.displayMode === 'standalone' && (
          <AppMenu config={undefined} setAppMenu={chrome.setAppMenu} />
        )
      }
      {children}
    </>
  );
};
