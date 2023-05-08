/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { EuiHeaderSectionItemButton, EuiIcon } from '@elastic/eui';
import { ChromeGlobalHelpExtensionMenuLink, ChromeHelpExtension } from '@kbn/core-chrome-browser';
import { i18n } from '@kbn/i18n';
import { Observable } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import type { HelpCenterApi } from '../lib/api';
import { HelpCenterFlyout } from './flyout_list';
import { FetchResult } from '../types';

export interface IHelpCenterContext {
  setFlyoutVisible: React.Dispatch<React.SetStateAction<boolean>>;
  newsFetchResult: FetchResult | void | null;

  kibanaDocLink: string;
  helpSupportLink?: string;
  helpExtension?: ChromeHelpExtension;
  globalHelpExtensionMenuLinks?: ChromeGlobalHelpExtensionMenuLink[];
}

export const HelpCenterContext = React.createContext({} as IHelpCenterContext);

export interface Props {
  helpCenterApi: HelpCenterApi;
  hasCustomBranding$: Observable<boolean>;
  kibanaDocLink: string;
  helpSupportLink?: string;
  helpExtension?: ChromeHelpExtension;
  globalHelpExtensionMenuLinks?: ChromeGlobalHelpExtensionMenuLink[];
}

export const HelpCenterNavButton = ({
  helpCenterApi,
  hasCustomBranding$,
  kibanaDocLink,
  helpExtension,
  helpSupportLink,
  globalHelpExtensionMenuLinks,
}: Props) => {
  const [flyoutVisible, setFlyoutVisible] = useState<boolean>(false);
  const [newsFetchResult, setNewsFetchResult] = useState<FetchResult | null | void>(null);
  const hasCustomBranding = useObservable(hasCustomBranding$, false);

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const setButtonRef = (node: HTMLButtonElement | null) => (buttonRef.current = node);

  useEffect(() => {
    const subscription = helpCenterApi.fetchResults$.subscribe((results) => {
      setNewsFetchResult(results);
    });
    return () => subscription.unsubscribe();
  }, [helpCenterApi]);

  const showFlyout = useCallback(() => {
    if (newsFetchResult) {
      helpCenterApi.markAsRead(newsFetchResult.feedItems.map((item) => item.hash));
    }
    setFlyoutVisible(!flyoutVisible);
  }, [helpCenterApi, newsFetchResult, flyoutVisible]);

  return (
    <HelpCenterContext.Provider
      value={{
        setFlyoutVisible,
        newsFetchResult,
        kibanaDocLink,
        helpSupportLink,
        helpExtension,
        globalHelpExtensionMenuLinks,
      }}
    >
      <>
        <EuiHeaderSectionItemButton
          ref={setButtonRef}
          data-test-subj="help_center"
          aria-controls="keyPadMenu"
          aria-expanded={flyoutVisible}
          aria-haspopup="true"
          aria-label={'Help center'}
          onClick={showFlyout}
        >
          <EuiIcon type="help" size="m" />
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
