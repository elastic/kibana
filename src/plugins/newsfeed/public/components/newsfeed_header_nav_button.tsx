/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { useState, Fragment, useEffect } from 'react';
import * as Rx from 'rxjs';
import { EuiHeaderSectionItemButton, EuiIcon, EuiNotificationBadge } from '@elastic/eui';
import { NewsfeedFlyout } from './flyout_list';
import { FetchResult } from '../lib/api';

export const NewsfeedContext = React.createContext({} as any);

interface Props {
  apiFetchResult: Rx.Observable<void | FetchResult | null>;
}

export const NewsfeedNavButton = ({ apiFetchResult }: Props) => {
  let subscription: Rx.Subscription;
  const [showBadge, setShowBadge] = useState<boolean>(true);
  const [flyoutVisible, setFlyoutVisible] = useState<boolean>(false);

  useEffect(() => {
    function handleStatusChange() {
      setShowBadge(true);
    }

    subscription = apiFetchResult.subscribe(handleStatusChange);
    // Specify how to clean up after this effect:
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  });

  function showFlyout() {
    setShowBadge(false);
    setFlyoutVisible(!flyoutVisible);
  }
  let flyout;
  if (flyoutVisible) {
    flyout = <NewsfeedFlyout />;
  }
  return (
    <NewsfeedContext.Provider value={{ setFlyoutVisible }}>
      <Fragment>
        <EuiHeaderSectionItemButton
          aria-controls="keyPadMenu"
          aria-expanded={flyoutVisible}
          aria-haspopup="true"
          aria-label="Apps menu"
          onClick={showFlyout}
        >
          <EuiIcon type="email" size="m" />

          {showBadge ? (
            <EuiNotificationBadge className="euiHeaderNotification">&#9642;</EuiNotificationBadge>
          ) : null}
        </EuiHeaderSectionItemButton>
        {flyout}
      </Fragment>
    </NewsfeedContext.Provider>
  );
};
