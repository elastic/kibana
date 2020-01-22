/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { useState, Fragment, useEffect } from 'react';
import * as Rx from 'rxjs';
import { EuiHeaderSectionItemButton, EuiIcon, EuiNotificationBadge } from '@elastic/eui';
import { NewsfeedFlyout } from './flyout_list';
import { FetchResult } from '../../types';

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

    const subscription = apiFetchResult.subscribe(res => handleStatusChange(res));
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
          aria-label="Newsfeed menu"
          onClick={showFlyout}
        >
          <EuiIcon type="email" size="m" />
          {showBadge ? (
            <EuiNotificationBadge className="euiHeaderNotification" data-test-subj="showBadgeNews">
              &#9642;
            </EuiNotificationBadge>
          ) : null}
        </EuiHeaderSectionItemButton>
        {flyoutVisible ? <NewsfeedFlyout /> : null}
      </Fragment>
    </NewsfeedContext.Provider>
  );
};
