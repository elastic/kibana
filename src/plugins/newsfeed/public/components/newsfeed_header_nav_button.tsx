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
import { NewsfeedItem, FetchResult } from '../../types';

export interface INewsfeedContext {
  setFlyoutVisible: React.Dispatch<React.SetStateAction<boolean>>;
  newsfeed: NewsfeedItem[];
  kibanaVersion: string | undefined;
}
export const NewsfeedContext = React.createContext({} as INewsfeedContext);

interface Props {
  apiFetchResult: Rx.Observable<void | FetchResult | null>;
}

export const NewsfeedNavButton = ({ apiFetchResult }: Props) => {
  const [showBadge, setShowBadge] = useState<boolean>(false);
  const [flyoutVisible, setFlyoutVisible] = useState<boolean>(false);
  const [newsfeed, setNewsfeed] = useState<NewsfeedItem[]>([]);
  const [kibanaVersion, setKibanaVersion] = useState<string | undefined>(undefined);

  useEffect(() => {
    function handleStatusChange(fetchResult: FetchResult) {
      setShowBadge(fetchResult.hasNew);
      setNewsfeed(fetchResult.feedItems);
      setKibanaVersion(fetchResult.kibanaVersion);
    }

    const subscription = apiFetchResult.subscribe(res => {
      if (res && !res.error) {
        handleStatusChange(res);
      }
    });
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [apiFetchResult]);

  function showFlyout() {
    setShowBadge(false);
    setFlyoutVisible(!flyoutVisible);
  }

  return (
    <NewsfeedContext.Provider value={{ setFlyoutVisible, newsfeed, kibanaVersion }}>
      <Fragment>
        <EuiHeaderSectionItemButton
          aria-controls="keyPadMenu"
          aria-expanded={flyoutVisible}
          aria-haspopup="true"
          aria-label="Apps menu"
          onClick={showFlyout}
        >
          <EuiIcon type="email" size="m" />
          {showBadge ? (
            <EuiNotificationBadge className="euiHeaderNotification">&#9642;</EuiNotificationBadge>
          ) : null}
        </EuiHeaderSectionItemButton>
         {flyoutVisible ? <NewsfeedFlyout /> : null}
      </Fragment>
    </NewsfeedContext.Provider>
  );
};
