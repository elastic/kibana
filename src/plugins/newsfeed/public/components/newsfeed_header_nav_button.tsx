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
// eslint-disable-next-line
import { PulseChannel } from 'src/core/public/pulse/channel';
// eslint-disable-next-line
import { NotificationInstruction } from 'src/core/server/pulse/collectors/notifications';
// eslint-disable-next-line
import { ErrorInstruction } from 'src/core/server/pulse/collectors/errors';
import moment from 'moment';
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
  notificationsChannel: PulseChannel<NotificationInstruction>;
  errorsChannel: PulseChannel<ErrorInstruction>;
}

const NEWSFEED_LAST_HASH = 'pulse_news_last_hash';

export function updateLastHash(lastNotificationHash: string) {
  sessionStorage.setItem(NEWSFEED_LAST_HASH, lastNotificationHash);
}

export function shouldUpdateHash(lastNotificationHash: string): boolean {
  const lastStoredHash: string | null = sessionStorage.getItem(NEWSFEED_LAST_HASH);
  if (lastStoredHash !== lastNotificationHash) {
    return true;
  }
  return false;
}

export function getLastItemHash(instructions: Array<{ hash: string }>) {
  return instructions[instructions.length - 1].hash;
}
/**
window.notificationsChannel.sendPulse([{
  "hash": "test_hash",
  "title": "Some error fixed in 8.0.1",
  "description": "The error you have encountered on jan 3rd has been fixed in the upcoming 8.0.1 release. Thanks for reporting!",
  "linkUrl": "https://www.youtube.com/watch?v=oHg5SJYRHA0",
  "linkText": "Link to github issue",
  "badge": null,
  "publishOn": moment().format('x'),
  "expireOn": moment().add(1, 'days').format('x'),
  "status": "new",
}])
*/

// on every fresh page reload, fetch news all over again.
updateLastHash('');

export const NewsfeedNavButton = ({
  apiFetchResult,
  notificationsChannel,
  errorsChannel,
}: Props) => {
  const [showBadge, setShowBadge] = useState<boolean>(false);
  const [flyoutVisible, setFlyoutVisible] = useState<boolean>(false);
  const [newsFetchResult, setNewsFetchResult] = useState<FetchResult | null | void>(null);
  const [showPulseBadge, setShowPulseBadge] = useState<boolean>(false);
  const [errorsInstructionsToShow, setErrorsInstructionsToShow] = useState<ErrorInstruction[]>([]);
  // hack to test updating news;
  (window as any).moment = moment;
  (window as any).notificationsChannel = notificationsChannel;
  // Pulse notifications
  const notificationsInstructions$ = notificationsChannel.instructions$();
  // Error Instructions
  const errorsInstructions$ = errorsChannel.instructions$();
  useEffect(() => {
    function handleStatusChange(instructions: NotificationInstruction[]) {
      const lastNotificationHash = getLastItemHash(instructions);
      const hasNew = instructions.some(instruction => instruction.status === 'new');
      const shouldUpdateResults = hasNew || shouldUpdateHash(lastNotificationHash);
      if (shouldUpdateResults) {
        if (hasNew) {
          setShowBadge(hasNew);
        }
        updateLastHash(lastNotificationHash);
        setNewsFetchResult({
          hasNew,
          feedItems: instructions.map(instruction => ({
            ...instruction,
            publishOn: moment(instruction.publishOn, 'x'),
            expireOn: moment(instruction.expireOn, 'x'),
          })),
          kibanaVersion: '8.0.0',
          error: null,
        });
      }
    }

    const subscription = notificationsInstructions$.subscribe(instructions => {
      if (instructions && instructions.length) {
        return handleStatusChange(instructions);
      }
    });
    return () => subscription.unsubscribe();
  }, [notificationsInstructions$]);

  // FOR THE POC: JUST USE PULSE AS THE SOURCE OF TRUTH FOR NEWS!
  // useEffect(() => {
  //   function handleStatusChange(fetchResult: FetchResult | void | null) {
  //     if (fetchResult) {
  //       setShowBadge(fetchResult.hasNew);
  //     }
  //     console.log('fetchResult::', fetchResult)
  //     setNewsFetchResult(fetchResult);
  //   }

  //   const subscription = apiFetchResult.subscribe(res => handleStatusChange(res));
  //   return () => subscription.unsubscribe();
  // }, [apiFetchResult]);

  // Errors Instructions
  useEffect(() => {
    function handleErrorsInstructionsChange(instructions: ErrorInstruction[]) {
      if (instructions.length) {
        setShowPulseBadge(instructions.length > 0);
        setErrorsInstructionsToShow(instructions);
      } else {
        setShowPulseBadge(false);
        setErrorsInstructionsToShow([]);
      }
    }
    const subscription = errorsInstructions$.subscribe(instructions => {
      if (instructions && instructions.length) {
        const newInstructions = instructions.filter(instruction => instruction.fixedVersion);
        handleErrorsInstructionsChange(newInstructions);
      }
    });
    return () => subscription.unsubscribe();
  }, [errorsInstructions$]);

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
          {showBadge || showPulseBadge ? (
            <EuiNotificationBadge className="euiHeaderNotification" data-test-subj="showBadgeNews">
              &#9642;
            </EuiNotificationBadge>
          ) : null}
        </EuiHeaderSectionItemButton>
        {flyoutVisible ? (
          <NewsfeedFlyout
            notificationsChannel={notificationsChannel}
            errorsChannel={errorsChannel}
            errorsInstructionsToShow={errorsInstructionsToShow}
          />
        ) : null}
      </Fragment>
    </NewsfeedContext.Provider>
  );
};
