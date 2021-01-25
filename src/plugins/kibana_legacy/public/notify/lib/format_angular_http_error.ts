/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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
    return i18n.translate('kibana_legacy.notify.fatalError.unavailableServerErrorMessage', {
      defaultMessage:
        'An HTTP request has failed to connect. ' +
        'Please check if the Kibana server is running and that your browser has a working connection, ' +
        'or contact your system administrator.',
    });
  }

  return i18n.translate('kibana_legacy.notify.fatalError.errorStatusMessage', {
    defaultMessage: 'Error {errStatus} {errStatusText}: {errMessage}',
    values: {
      errStatus: error.status,
      errStatusText: error.statusText,
      errMessage: error.data.message,
    },
  });
}
