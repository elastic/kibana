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

import { modifyUrl } from '../../../../core/public/utils';
import { toastNotifications } from '../toasts';

const APP_REDIRECT_MESSAGE_PARAM = 'app_redirect_message';

export function addAppRedirectMessageToUrl(url, message) {
  return modifyUrl(url, urlParts => {
    urlParts.hash = modifyUrl(urlParts.hash || '', hashParts => {
      hashParts.query[APP_REDIRECT_MESSAGE_PARAM] = message;
    });
  });
}

// If an app needs to redirect, e.g. due to an expired license, it can surface a message via
// the URL query params.
export function showAppRedirectNotification($location) {
  const queryString = $location.search();

  if (!queryString[APP_REDIRECT_MESSAGE_PARAM]) {
    return;
  }

  const message = queryString[APP_REDIRECT_MESSAGE_PARAM];
  $location.search(APP_REDIRECT_MESSAGE_PARAM, null);

  toastNotifications.addDanger(message);
}
