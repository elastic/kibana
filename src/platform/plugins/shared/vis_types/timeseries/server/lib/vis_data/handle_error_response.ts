/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import type { Panel } from '../../../common/types';

type ErrorType =
  | {
      reason: string;
      caused_by?: ErrorType;
    }
  | string;

export type ErrorResponse = Error &
  Partial<{
    errBody:
      | {
          error: ErrorType;
        }
      | string;
  }>;

const getErrorMessage = (errBody: ErrorType, defaultMessage?: string): string | undefined => {
  if (typeof errBody === 'string') {
    return errBody;
  } else {
    if (errBody.caused_by) {
      return getErrorMessage(errBody.caused_by, errBody.reason);
    }
    return errBody.reason || defaultMessage;
  }
};

export const handleErrorResponse = (panel: Panel) => (error: ErrorResponse) => {
  const result: Record<string, unknown> = {};

  if (error.errBody) {
    const errorResponse =
      typeof error.errBody === 'string' ? error.errBody : getErrorMessage(error.errBody.error);

    result[panel.id] = {
      id: panel.id,
      error:
        errorResponse ??
        i18n.translate('visTypeTimeseries.handleErrorResponse.unexpectedError', {
          defaultMessage: 'Unexpected error',
        }),
      series: [],
    };
  }

  return result;
};
