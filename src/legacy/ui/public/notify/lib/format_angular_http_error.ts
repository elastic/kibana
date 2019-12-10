/*
 * THIS FILE HAS BEEN MODIFIED FROM THE ORIGINAL SOURCE
 * This comment only applies to modifications applied after the e633644c43a0a0271e0b6c32c382ce1db6b413c3 commit
 *
 * Copyright 2019 LogRhythm, Inc
 * Licensed under the LogRhythm Global End User License Agreement,
 * which can be found through this page: https://logrhythm.com/about/logrhythm-terms-and-conditions/
 */

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

import { i18n } from '@kbn/i18n';
import { IHttpResponse } from 'angular';

export type AngularHttpError = IHttpResponse<{ message: string }>;

export function isAngularHttpError(error: any): error is AngularHttpError {
  return (
    error &&
    typeof error.status === 'number' &&
    typeof error.statusText === 'string' &&
    error.data &&
    typeof error.data.message === 'string'
  );
}

export function formatAngularHttpError(error: AngularHttpError) {
  // is an Angular $http "error object"
  if (error.status === -1) {
    // status = -1 indicates that the request was failed to reach the server
    return i18n.translate('common.ui.notify.fatalError.unavailableServerErrorMessage', {
      defaultMessage:
        'An HTTP request has failed to connect. ' +
        'Please check if the NetMon-UI server is running and that your browser has a working connection, ' +
        'or contact your system administrator.',
    });
  }

  return i18n.translate('common.ui.notify.fatalError.errorStatusMessage', {
    defaultMessage: 'Error {errStatus} {errStatusText}: {errMessage}',
    values: {
      errStatus: error.status,
      errStatusText: error.statusText,
      errMessage: error.data.message,
    },
  });
}
