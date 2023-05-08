/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { EuiHeaderSectionItemButton, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { Observable } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import type { HelpCenterApi } from '../lib/api';
import { HelpCenterFlyout } from './flyout_list';
import { FetchResult } from '../types';

export interface IHelpCenterContext {
  setFlyoutVisible: React.Dispatch<React.SetStateAction<boolean>>;
  newsFetchResult: FetchResult | void | null;
}

export const HelpCenterContext = React.createContext({} as IHelpCenterContext);

export interface Props {
  HelpCenterApi: HelpCenterApi;
  hasCustomBranding$: Observable<boolean>;
}

export const HelpCenterNavButton = ({ HelpCenterApi, hasCustomBranding$ }: Props) => {
  const [flyoutVisible, setFlyoutVisible] = useState<boolean>(false);
  const [newsFetchResult, setNewsFetchResult] = useState<FetchResult | null | void>(null);
  const hasCustomBranding = useObservable(hasCustomBranding$, false);
  const hasNew = useMemo(() => {
    return newsFetchResult ? newsFetchResult.hasNew : false;
  }, [newsFetchResult]);

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const setButtonRef = (node: HTMLButtonElement | null) => (buttonRef.current = node);

  useEffect(() => {
    const subscription = HelpCenterApi.fetchResults$.subscribe((results) => {
      setNewsFetchResult(results);
    });
    return () => subscription.unsubscribe();
  }, [HelpCenterApi]);

  const showFlyout = useCallback(() => {
    if (newsFetchResult) {
      HelpCenterApi.markAsRead(newsFetchResult.feedItems.map((item) => item.hash));
    }
    setFlyoutVisible(!flyoutVisible);
  }, [HelpCenterApi, newsFetchResult, flyoutVisible]);

  return (
    <HelpCenterContext.Provider value={{ setFlyoutVisible, newsFetchResult }}>
      <>
        <EuiHeaderSectionItemButton
          ref={setButtonRef}
          data-test-subj="HelpCenter"
          aria-controls="keyPadMenu"
          aria-expanded={flyoutVisible}
          aria-haspopup="true"
          aria-label={
            hasNew
              ? i18n.translate('HelpCenter.headerButton.unreadAriaLabel', {
                  defaultMessage: 'HelpCenter menu - unread items available',
                })
              : i18n.translate('HelpCenter.headerButton.readAriaLabel', {
                  defaultMessage: 'HelpCenter menu - all items read',
                })
          }
          notification={hasNew ? true : null}
          onClick={showFlyout}
        >
          <EuiIcon type="cheer" size="m" />
        </EuiHeaderSectionItemButton>
        {flyoutVisible ? (
          <HelpCenterFlyout
            focusTrapProps={{ shards: [buttonRef] }}
            showPlainSpinner={hasCustomBranding}
          />
        ) : null}
      </>
    </HelpCenterContext.Provider>
  );
};
