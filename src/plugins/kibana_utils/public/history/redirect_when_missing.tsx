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
import { History } from 'history';
import { i18n } from '@kbn/i18n';

import { ToastsSetup } from 'kibana/public';
import { MarkdownSimple, toMountPoint } from '../../../kibana_react/public';
import { SavedObjectNotFound } from '../errors';

interface Mapping {
  [key: string]: string;
}

/**
 * Creates an error handler that will redirect to a url when a SavedObjectNotFound
 * error is thrown
 */
export function redirectWhenMissing({
  history,
  mapping,
  toastNotifications,
  onBeforeRedirect,
}: {
  history: History;
  /**
   * a mapping of url's to redirect to based on the saved object that
   * couldn't be found, or just a string that will be used for all types
   */
  mapping: string | Mapping;
  /**
   * Toast notifications service to show toasts in error cases.
   */
  toastNotifications: ToastsSetup;
  /**
   * Optional callback invoked directly before a redirect is triggered
   */
  onBeforeRedirect?: (error: SavedObjectNotFound) => void;
}) {
  let localMappingObject: Mapping;

  if (typeof mapping === 'string') {
    localMappingObject = { '*': mapping };
  } else {
    localMappingObject = mapping;
  }

  return (error: SavedObjectNotFound) => {
    // if this error is not "404", rethrow
    // we can't check "error instanceof SavedObjectNotFound" since this class can live in a separate bundle
    // and the error will be an instance of other class with the same interface (actually the copy of SavedObjectNotFound class)
    if (!error.savedObjectType) {
      throw error;
    }

    let url = localMappingObject[error.savedObjectType] || localMappingObject['*'] || '/';
    url += (url.indexOf('?') >= 0 ? '&' : '?') + `notFound=${error.savedObjectType}`;

    toastNotifications.addWarning({
      title: i18n.translate('kibana_utils.history.savedObjectIsMissingNotificationMessage', {
        defaultMessage: 'Saved object is missing',
      }),
      text: toMountPoint(<MarkdownSimple>{error.message}</MarkdownSimple>),
    });

    if (onBeforeRedirect) {
      onBeforeRedirect(error);
    }
    history.replace(url);
  };
}
