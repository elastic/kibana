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

import React from 'react';
import { EuiCallOut } from '@elastic/eui';
import { NotificationsStart, OverlayStart } from 'kibana/public';
import { parse } from 'query-string';
import { i18n } from '@kbn/i18n';
import { toMountPoint } from '../../../kibana_react/public';
import { MarkdownSimple } from '../../../kibana_react/public';

/**
 * Show banners and toasts carried over from other applications. This is only necessary as long as
 * management is rendered in the legacy platform (which requires a full page reload to switch to).
 *
 * Once management is rendered using the core application service, this file and the places setting
 * bannerMessage and notFoundMessage URL params can be removed.
 * @param notifications Core notifications service
 * @param overlays Core overlays service
 */
export function showLegacyRedirectMessages(
  notifications: NotificationsStart,
  overlays: OverlayStart
) {
  const queryPosition = window.location.hash.indexOf('?');
  if (queryPosition === -1) {
    return;
  }

  const urlParams = parse(window.location.hash.substr(queryPosition)) as Record<string, string>;

  if (urlParams.bannerMessage) {
    const bannerId = overlays.banners.add(
      toMountPoint(
        <EuiCallOut color="warning" iconType="iInCircle" title={urlParams.bannerMessage} />
      )
    );
    setTimeout(() => {
      overlays.banners.remove(bannerId);
    }, 15000);
  }

  if (urlParams.notFoundMessage) {
    notifications.toasts.addWarning({
      title: i18n.translate('management.history.savedObjectIsMissingNotificationMessage', {
        defaultMessage: 'Saved object is missing',
      }),
      text: toMountPoint(<MarkdownSimple>{urlParams.notFoundMessage}</MarkdownSimple>),
    });
  }
}
