/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { useState, Fragment, useEffect } from 'react';
import * as Rx from 'rxjs';
import { EuiHeaderSectionItemButton, EuiIcon } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { NewsfeedFlyout } from './flyout_list';
import { FetchResult } from '../types';

export interface INewsfeedContext {
  setFlyoutVisible: React.Dispatch<React.SetStateAction<boolean>>;
  newsFetchResult: FetchResult | void | null;
}
export const NewsfeedContext = React.createContext({} as INewsfeedContext);

export type NewsfeedApiFetchResult = Rx.Observable<void | FetchResult | null>;

export interface Props {
  apiFetchResult: NewsfeedApiFetchResult;
}

export const NewsfeedNavButton = ({ apiFetchResult }: Props) => {
  const [showBadge, setShowBadge] = useState<boolean>(false);
  const [flyoutVisible, setFlyoutVisible] = useState<boolean>(false);
  const [newsFetchResult, setNewsFetchResult] = useState<FetchResult | null | void>(null);

  useEffect(() => {
    function handleStatusChange(fetchResult: FetchResult | void | null) {
      if (fetchResult) {
        setShowBadge(fetchResult.hasNew);
      }
      setNewsFetchResult(fetchResult);
    }

    const subscription = apiFetchResult.subscribe((res) => handleStatusChange(res));
    return () => subscription.unsubscribe();
  }, [apiFetchResult]);

  function showFlyout() {
    setShowBadge(false);
    setFlyoutVisible(!flyoutVisible);
  }

  return (
    <NewsfeedContext.Provider value={{ setFlyoutVisible, newsFetchResult }}>
      <Fragment>
        <EuiHeaderSectionItemButton
          data-test-subj="newsfeed"
          aria-controls="keyPadMenu"
          aria-expanded={flyoutVisible}
          aria-haspopup="true"
          aria-label={
            showBadge
              ? i18n.translate('newsfeed.headerButton.unreadAriaLabel', {
                  defaultMessage: 'Newsfeed menu - unread items available',
                })
              : i18n.translate('newsfeed.headerButton.readAriaLabel', {
                  defaultMessage: 'Newsfeed menu - all items read',
                })
          }
          notification={showBadge ? true : null}
          onClick={showFlyout}
        >
          <EuiIcon type="cheer" size="m" />
        </EuiHeaderSectionItemButton>
        {flyoutVisible ? <NewsfeedFlyout /> : null}
      </Fragment>
    </NewsfeedContext.Provider>
  );
};
