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
  EuiHeaderAlert,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { NewsfeedContext } from './newsfeed_header_nav_button';
import { NewsfeedItem } from '../types';
import { NewsEmptyPrompt } from './empty_news';
import { NewsLoadingPrompt } from './loading_news';

export const NewsfeedFlyout = () => {
  const { newsFetchResult, setFlyoutVisible } = useContext(NewsfeedContext);
  const closeFlyout = useCallback(() => setFlyoutVisible(false), [setFlyoutVisible]);

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
              defaultMessage="What's new at Elastic"
            />
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
                  <EuiLink target="_blank" href={item.linkUrl} external>
                    {item.linkText}
                  </EuiLink>
                }
                date={item.publishOn.format('DD MMMM YYYY')}
                badge={item.badge ? <EuiBadge color="hollow">{item.badge}</EuiBadge> : undefined}
              />
            );
          })
        ) : (
          <NewsEmptyPrompt />
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
