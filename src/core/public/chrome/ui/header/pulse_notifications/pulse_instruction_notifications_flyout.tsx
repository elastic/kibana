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

import React, { useState, useEffect } from 'react';
import {
  EuiIcon,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiLink,
  EuiFlyoutFooter,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiText,
  EuiBadge,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiHeaderAlert } from '@elastic/eui';
import { Moment } from 'moment';
import { PulseInstructionsNotificationsEmptyPrompt } from './pulse_instructions_notifications_empty_feed';
import { PulseLoadingPrompt } from './pulse_loading_prompt';

export interface PulseNotificationItem {
  title: string;
  description: string;
  linkText?: string;
  linkUrl?: string;
  badge?: string | null;
  publishOn?: Moment;
  expireOn?: Moment;
  hash?: string;
}

export interface FetchResult {
  kibanaVersion: string;
  hasNew: boolean;
  feedItems: any[];
  error: Error | null;
}
export interface IPulseNotificationsState {
  setFlyoutVisible: React.SetStateAction<boolean>;
  flyoutVisible: boolean;
}

export const PulseNotificationsFlyout = () => {
  const [flyoutVisible, setFlyoutVisible] = useState(true);
  const closeFlyout = () => setFlyoutVisible(false);
  const [pulseNotifications, setPulseNotifications] = useState([] as PulseNotificationItem[]);
  useEffect(() => {
    setPulseNotifications([
      { title: 'TitleA', description: 'DescriptionA' },
      { title: 'TitleB', description: 'DescriptionB' },
    ]);
  }, [flyoutVisible]);
  return (
    <EuiFlyout
      onClose={closeFlyout}
      size="s"
      aria-labelledby="flyoutSmallTitle"
      className="kbnNews__flyout"
      data-test-subj="NewsfeedFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id="flyoutSmallTitle">
            <FormattedMessage
              id="newsfeed.flyoutList.whatsNewTitle"
              defaultMessage="What's new for your deployment"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody className={'kbnNews__flyoutAlerts'}>
        {!flyoutVisible ? (
          <PulseLoadingPrompt />
        ) : pulseNotifications.length > 0 ? (
          pulseNotifications.map((item: PulseNotificationItem, index: number) => {
            return (
              <EuiHeaderAlert
                key={item.hash ? item.hash : index}
                title={item.title}
                text={item.description}
                data-test-subj="newsHeadAlert"
                action={
                  <EuiLink target="_blank" href={item.linkUrl ? item.linkUrl : '#'}>
                    {item.linkText ? item.linkText : 'no link'}
                    <EuiIcon type="popout" size="s" />
                  </EuiLink>
                }
                date={item && item.publishOn ? item.publishOn.format('DD MMMM YYYY') : null}
                badge={
                  <EuiBadge color="hollow">
                    {item && item.badge ? item.badge : <EuiIcon type="heart" />}
                  </EuiBadge>
                }
              />
            );
          })
        ) : (
          <PulseInstructionsNotificationsEmptyPrompt />
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={closeFlyout} flush="left">
              <FormattedMessage id="newsfeed.flyoutList.closeButtonLabel" defaultMessage="Close" />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {flyoutVisible ? (
              <EuiText color="subdued" size="s">
                <p>
                  <FormattedMessage
                    id="newsfeed.flyoutList.versionTextLabel"
                    defaultMessage="{version}"
                    values={{
                      version: `Version ${'Pulse POC'}`,
                    }}
                  />
                </p>
              </EuiText>
            ) : null}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
