/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';
import { i18n } from '@kbn/i18n';
import { formatESMsg } from './format_es_msg';
const has = _.has;

/**
 * Formats the error message from an error object, extended elasticsearch
 * object or simple string; prepends optional second parameter to the message
 * @param  {Error|String} err
 * @param  {String} source - Prefix for message indicating source (optional)
 * @returns {string}
 */
export function formatMsg(err: Record<string, any> | string, source: string = '') {
  let message = '';
  if (source) {
    message += source + ': ';
  }

  const esMsg = formatESMsg(err);

  if (typeof err === 'string') {
    message += err;
  } else if (esMsg) {
    message += esMsg;
  } else if (err instanceof Error) {
    message += formatMsg.describeError(err);
  } else if (has(err, 'status') && has(err, 'data')) {
    // is an Angular $http "error object"
    if (err.status === -1) {
      // status = -1 indicates that the request was failed to reach the server
      message += i18n.translate('kibana_legacy.notify.toaster.unavailableServerErrorMessage', {
        defaultMessage:
          'An HTTP request has failed to connect. ' +
          'Please check if the Kibana server is running and that your browser has a working connection, ' +
          'or contact your system administrator.',
      });
    } else {
      message += i18n.translate('kibana_legacy.notify.toaster.errorStatusMessage', {
        defaultMessage: 'Error {errStatus} {errStatusText}: {errMessage}',
        values: {
          errStatus: err.status,
          errStatusText: err.statusText,
          errMessage: err.data.message,
        },
      });
    }
  }

  return message;
}

formatMsg.describeError = function (err: Record<string, any>) {
  if (!err) return undefined;
  if (err.shortMessage) return err.shortMessage;
  if (err.body && err.body.message) return err.body.message;
  if (err.message) return err.message;
  return '' + err;
};
