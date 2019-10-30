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
import { i18n } from '@kbn/i18n';
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
import { EuiHeaderAlert } from '../../../../legacy/core_plugins/newsfeed/public/np_ready/components/header_alert/header_alert';
import { NewsfeedContext } from './newsfeed_header_nav_button';
import { NewsfeedItem } from '../../types';

export const NewsfeedFlyout = () => {
  const { newsfeed, kibanaVersion, setFlyoutVisible } = useContext(NewsfeedContext);
  const closeFlyout = useCallback(() => setFlyoutVisible(false), []);
  return (
    <EuiFlyout onClose={closeFlyout} size="s" aria-labelledby="flyoutSmallTitle">
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="s">
          <h2 id="flyoutSmallTitle">
            <FormattedMessage
              id="newsfeed.components.flyoutList.flyoutTitle"
              defaultMessage="What's new"
            />
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody className={'kbnNews__flyoutAlerts'}>
        {newsfeed.map((item: NewsfeedItem) => {
          return (
            <EuiHeaderAlert
              title={item.title}
              text={item.description}
              action={
                <EuiLink target="_blank" href={item.linkUrl}>
                  {item.linkText}
                  <EuiIcon type="popout" size="s" />
                </EuiLink>
              }
              date={item.publishOn.format('DD MMMM YYYY')}
              badge={<EuiBadge color="hollow">{item.badge}</EuiBadge>}
            />
          );
        })}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty iconType="cross" onClick={closeFlyout} flush="left">
              <FormattedMessage
                id="newsfeed.components.flyoutList.closeButtonLabel"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiText color="subdued" size="s">
              <p>
                {i18n.translate('xpack.reporting.publicNotifier.httpErrorMessage', {
                  defaultMessage: `Version ${kibanaVersion}`,
                })}
              </p>
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
