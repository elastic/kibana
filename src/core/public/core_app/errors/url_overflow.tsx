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
import { History, Location } from 'history';

import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';

import { mountReactNode } from '../../utils';
import { IToasts } from '../../notifications';
import { IBasePath } from '../../http';
import { IUiSettingsClient } from '../../ui_settings';

const IE_REGEX = /(; ?MSIE |Edge\/\d|Trident\/[\d+\.]+;.*rv:*11\.\d+)/;
export const IS_IE = IE_REGEX.test(window.navigator.userAgent);
/**
 * The max URL length allowed by the current browser. Should be used to display warnings to users when query parameters
 * cause URL to exceed this limit.
 * @public
 */
export const URL_MAX_LENGTH = IS_IE ? 2000 : 25000;
export const URL_WARNING_LENGTH = IS_IE ? 1000 : 24000;
const ERROR_ROUTE = '/app/error';

interface Deps {
  basePath: IBasePath;
  history: History;
  toasts: IToasts;
  uiSettings: IUiSettingsClient;
}

export const setupUrlOverflowDetection = ({ basePath, history, toasts, uiSettings }: Deps) =>
  history.listen((location: Location) => {
    // Bail if storeInSessionStorage is set or we're already on the error page
    if (
      uiSettings.get('state:storeInSessionStorage') ||
      history.location.pathname.startsWith(ERROR_ROUTE)
    ) {
      return;
    }

    const absUrl = history.createHref(location);
    const absUrlLength = absUrl.length;

    if (absUrlLength > URL_MAX_LENGTH) {
      const href = history.createHref({
        pathname: ERROR_ROUTE,
        search: `errorType=urlOverflow`,
      });
      // Force the browser to reload so that any potentially unstable state is unloaded
      window.location.assign(href);
      // window.location.href = href;
      // window.location.reload();
    } else if (absUrlLength >= URL_WARNING_LENGTH) {
      toasts.addWarning({
        title: i18n.translate('core.ui.errorUrlOverflow.bigUrlWarningNotificationTitle', {
          defaultMessage: 'The URL is big and Kibana might stop working',
        }),
        text: mountReactNode(
          <FormattedMessage
            id="core.ui.errorUrlOverflow.bigUrlWarningNotificationMessage"
            defaultMessage="Either enable the {storeInSessionStorageParam} option
                    in {advancedSettingsLink} or simplify the onscreen visuals."
            values={{
              storeInSessionStorageParam: <code>state:storeInSessionStorage</code>,
              advancedSettingsLink: (
                <a href={basePath.prepend('/app/management/kibana/settings')}>
                  <FormattedMessage
                    id="core.ui.errorUrlOverflow.bigUrlWarningNotificationMessage.advancedSettingsLinkText"
                    defaultMessage="advanced settings"
                  />
                </a>
              ),
            }}
          />
        ),
      });
    }
  });
