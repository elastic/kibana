/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Observable } from 'rxjs';

import { EuiHeaderSectionItemButton, EuiIcon } from '@elastic/eui';

import { HelpCenterPanel } from './help_center_panel';
import type { HelpCenterApi } from '../lib/api';
import { FetchResult } from '../types';

export interface IHelpCenterContext {
  kibanaVersion: string;
  setFlyoutVisible: React.Dispatch<React.SetStateAction<boolean>>;
  helpFetchResults: void | FetchResult | null;
}

export const HelpCenterContext = React.createContext({} as IHelpCenterContext);

export interface Props {
  helpCenterApi: HelpCenterApi;
}

export const HelpCenterNavButton = ({ helpCenterApi }: Props) => {
  const [flyoutVisible, setFlyoutVisible] = useState<boolean>(false);
  const [helpFetchResult, setHelpFetchResult] = useState<void | FetchResult | null>(null);
  const [topNav, setTopNav] = useState<HTMLElement | null>();

  useEffect(() => {
    setTopNav(document.querySelectorAll<HTMLElement>('#kibana-body')[0]);
  }, []);

  const kibanaVersion = helpCenterApi.kibanaVersion;
  useEffect(() => {
    const helpLinksSubscription = helpCenterApi.fetchResults$.subscribe((links) => {
      setHelpFetchResult(links);
    });
    return () => {
      helpLinksSubscription.unsubscribe();
    };
  }, [helpCenterApi.fetchResults$]);

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const setButtonRef = (node: HTMLButtonElement | null) => (buttonRef.current = node);

  const showFlyout = useCallback(() => {
    setFlyoutVisible(!flyoutVisible);
  }, [flyoutVisible]);

  return (
    <HelpCenterContext.Provider
      value={{
        kibanaVersion,
        setFlyoutVisible,
        helpFetchResults: helpFetchResult,
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
        {flyoutVisible && topNav ? (
          <HelpCenterPanel headerRef={topNav} username={helpCenterApi.username} />
        ) : null}
      </>
    </HelpCenterContext.Provider>
  );
};
