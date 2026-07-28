/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { VegaSandboxErrorCode, VegaSandboxWarningCode } from '@kbn/vega-sandbox';

export interface VegaSandboxMessage {
  code: VegaSandboxErrorCode | VegaSandboxWarningCode;
  values?: Record<string, unknown>;
}

const getMessageValue = ({ values }: VegaSandboxMessage): string =>
  typeof values?.message === 'string' ? values.message : '';

export const translateVegaSandboxError = (message: VegaSandboxMessage): string => {
  switch (message.code) {
    case VegaSandboxErrorCode.RenderFailed:
      return i18n.translate('visTypeVega.sandbox.renderFailedErrorMessage', {
        defaultMessage: 'Vega sandbox rendering failed: {message}',
        values: { message: getMessageValue(message) },
      });
  }
};

export const translateVegaSandboxWarning = (message: VegaSandboxMessage): string => {
  switch (message.code) {
    case VegaSandboxWarningCode.RuntimeWarning:
      return i18n.translate('visTypeVega.sandbox.runtimeWarningMessage', {
        defaultMessage: 'Vega sandbox warning: {message}',
        values: { message: getMessageValue(message) },
      });
  }
};
