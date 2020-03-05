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
import React, { useCallback, useContext } from 'react';
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
// eslint-disable-next-line
import { PulseChannel } from 'src/core/public/pulse/channel';
// eslint-disable-next-line
import { NotificationInstruction } from 'src/core/server/pulse/collectors/notifications';
import moment from 'moment';
// eslint-disable-next-line
import { ErrorInstruction } from 'src/core/server/pulse/collectors/errors';
import { EuiHeaderAlert } from '../../../../legacy/core_plugins/newsfeed/public/np_ready/components/header_alert/header_alert';
import { NewsfeedContext, shouldUpdateHash, getLastItemHash } from './newsfeed_header_nav_button';
import { NewsfeedItem } from '../../types';
import { NewsEmptyPrompt } from './empty_news';
import { NewsLoadingPrompt } from './loading_news';

interface Props {
  notificationsChannel: PulseChannel<NotificationInstruction>;
  errorsChannel: PulseChannel<ErrorInstruction>;
  errorsInstructionsToShow: ErrorInstruction[];
}

export const NewsfeedFlyout = ({
  notificationsChannel,
  errorsChannel,
  errorsInstructionsToShow,
}: Props) => {
  const { newsFetchResult, setFlyoutVisible } = useContext(NewsfeedContext);
  const closeFlyout = useCallback(() => setFlyoutVisible(false), [setFlyoutVisible]);

  if (newsFetchResult && newsFetchResult.feedItems.length) {
    const lastNotificationHash = getLastItemHash(newsFetchResult.feedItems);
    const hasNew = newsFetchResult.feedItems.some(item => item.status === 'new');
    const shouldUpdateResults = hasNew || shouldUpdateHash(lastNotificationHash);
    if (shouldUpdateResults) {
      notificationsChannel.sendPulse(
        newsFetchResult.feedItems.map(feedItem => {
          return {
            ...feedItem,
            publishOn: feedItem.publishOn.format('x'),
            expireOn: feedItem.expireOn.format('x'),
            status: 'seen',
            seenOn: moment().format('x'),
          };
        })
      );
    }
  }

  if (errorsInstructionsToShow && errorsInstructionsToShow.length > 0) {
    const hasNewErrorInstructionsToShow = errorsInstructionsToShow.filter(
      instruction => instruction.status === 'new' && !instruction.seenOn!
    );
    if (hasNewErrorInstructionsToShow.length > 0) {
      errorsChannel.sendPulse(
        hasNewErrorInstructionsToShow.map(item => {
          return {
            ...item,
            status: 'seen',
            seenOn: moment().format('x'),
          };
        })
      );
    }
  }

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
            <FormattedMessage id="newsfeed.flyoutList.whatsNewTitle" defaultMessage="What's new" />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody className={'kbnNews__flyoutAlerts'}>
        {!newsFetchResult ? (
          <NewsLoadingPrompt />
        ) : newsFetchResult.feedItems.length > 0 ? (
          newsFetchResult.feedItems.map((item: NewsfeedItem) => {
            return (
              <EuiHeaderAlert
                key={item.hash}
                title={item.title}
                text={item.description}
                data-test-subj="newsHeadAlert"
                action={
                  <EuiLink target="_blank" href={item.linkUrl}>
                    {item.linkText}
                    <EuiIcon type="popout" size="s" />
                  </EuiLink>
                }
                date={moment(item.publishOn).format('DD MMMM YYYY')}
                badge={<EuiBadge color="hollow">{item.badge}</EuiBadge>}
              />
            );
          })
        ) : (
          <NewsEmptyPrompt />
        )}
        {errorsInstructionsToShow &&
          errorsInstructionsToShow.length > 0 &&
          errorsInstructionsToShow.map((item: ErrorInstruction, index: number) => {
            return (
              <EuiHeaderAlert
                key={index}
                title={item.hash}
                text={`The error ${item.hash} has been fixed in version ${item.fixedVersion}.`}
                action={
                  <EuiLink target="_blank" href="#">
                    {item.fixedVersion}
                  </EuiLink>
                }
                date={moment(item.timestamp).format('DD MMMM YYYY HH:MM:SS')}
                badge={<EuiBadge color="hollow">{item.fixedVersion}</EuiBadge>}
              />
            );
          })}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={closeFlyout} flush="left">
              <FormattedMessage id="newsfeed.flyoutList.closeButtonLabel" defaultMessage="Close" />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            {newsFetchResult ? (
              <EuiText color="subdued" size="s">
                <p>
                  <FormattedMessage
                    id="newsfeed.flyoutList.versionTextLabel"
                    defaultMessage="{version}"
                    values={{ version: `Version ${newsFetchResult.kibanaVersion}` }}
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
