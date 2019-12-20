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

import React, { useState } from 'react';
import { EuiNotificationBadge, EuiHeaderSectionItemButton } from '@elastic/eui';
import { EuiIcon } from '@elastic/eui';
import { PulseNotificationsFlyout } from './pulse_instruction_notifications_flyout';

export const PulseNotificationsTrigger = () => {
  const [showBadge, setShowBadge] = useState<boolean>(false);
  const [flyoutVisible, setFlyoutVisible] = useState<boolean>(false);

  function showFlyout() {
    setShowBadge(false);
    setFlyoutVisible(!flyoutVisible);
  }
  // these will be the instruction notifications for the current deployment that are returned from making a call to the `check` functions of the Pulse channels.
  // const showBadge = instructions && instructions.length ? true : false; // showBadge should only be true when we have instructions/notifications from Pulse for the current deployment
  // let flyoutVisible = false; // when the bell is clicked we toggle between an open and closed state
  // return (
  //   <EuiHeaderSectionItemButton
  //       data-test-subj="newsfeed"
  //       aria-controls="keyPadMenu"
  //       aria-expanded={flyoutVisible}
  //       aria-haspopup="true"
  //       aria-label="Newsfeed menu"
  //       onClick={showFlyout}
  //     >
  //       <EuiIcon type="email" size="m" />
  //       {showBadge ? (
  //         <EuiNotificationBadge className="euiHeaderNotification" data-test-subj="showBadgeNews">
  //           &#9642;
  //         </EuiNotificationBadge>
  //       ) : null}
  //     </EuiHeaderSectionItemButton>
  //     {flyoutVisible ? <NewsfeedFlyout /> : null}
  // )
  return (
    <EuiHeaderSectionItemButton aria-label="Pulse Notifications menu" onClick={showFlyout}>
      <EuiIcon type="bell" size="m" />
      {showBadge ? (
        <EuiNotificationBadge className="euiHeaderNotification">&#9642;</EuiNotificationBadge>
      ) : null}
      {flyoutVisible ? <PulseNotificationsFlyout /> : null}
    </EuiHeaderSectionItemButton>
  );
};
