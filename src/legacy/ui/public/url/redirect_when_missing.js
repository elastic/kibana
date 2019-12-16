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
import { i18n } from '@kbn/i18n';
import { MarkdownSimple } from '../../../core_plugins/kibana_react/public/markdown';
import { toastNotifications } from 'ui/notify';
import { SavedObjectNotFound } from '../../../../plugins/kibana_utils/public';
import { uiModules } from '../modules';

uiModules.get('kibana/url').service('redirectWhenMissing', function(Private) {
  return Private(RedirectWhenMissingProvider);
});

export function RedirectWhenMissingProvider(kbnUrl, Promise) {
  /**
   * Creates an error handler that will redirect to a url when a SavedObjectNotFound
   * error is thrown
   *
   * @param  {string|object} mapping - a mapping of url's to redirect to based on the saved object that
   *                                 couldn't be found, or just a string that will be used for all types
   * @return {function} - the handler to pass to .catch()
   */
  return function(mapping) {
    if (typeof mapping === 'string') {
      mapping = { '*': mapping };
    }

    return function(error) {
      // if this error is not "404", rethrow
      const savedObjectNotFound = error instanceof SavedObjectNotFound;
      const unknownVisType = error.message.indexOf('Invalid type') === 0;
      if (unknownVisType) {
        error.savedObjectType = 'visualization';
      } else if (!savedObjectNotFound) {
        throw error;
      }

      let url = mapping[error.savedObjectType] || mapping['*'];
      if (!url) url = '/';

      url += (url.indexOf('?') >= 0 ? '&' : '?') + `notFound=${error.savedObjectType}`;

      toastNotifications.addWarning({
        title: i18n.translate('common.ui.url.savedObjectIsMissingNotificationMessage', {
          defaultMessage: 'Saved object is missing',
        }),
        text: <MarkdownSimple>{error.message}</MarkdownSimple>,
      });

      kbnUrl.redirect(url);
      return Promise.halt();
    };
  };
}
