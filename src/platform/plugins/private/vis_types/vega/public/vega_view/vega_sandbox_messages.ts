/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import {
  VegaSandboxErrorCode,
  VegaSandboxWarningCode,
  type VegaSandboxErrorPayload,
  type VegaSandboxWarningPayload,
} from '@kbn/vega-sandbox';

const getMessageValue = ({ values }: { values?: Record<string, unknown> }): string =>
  typeof values?.message === 'string' ? values.message : '';

export const translateVegaSandboxError = (error: VegaSandboxErrorPayload): string => {
  switch (error.code) {
    case VegaSandboxErrorCode.RenderFailed:
      return i18n.translate('visTypeVega.sandbox.renderFailedErrorMessage', {
        defaultMessage: 'Vega sandbox rendering failed: {message}',
        values: { message: getMessageValue(error) },
      });
    case VegaSandboxErrorCode.UnsupportedProtocolVersion:
      return i18n.translate('visTypeVega.sandbox.unsupportedProtocolVersionErrorMessage', {
        defaultMessage: 'The Vega sandbox protocol version is not supported.',
      });
    default:
      return i18n.translate('visTypeVega.sandbox.unknownErrorMessage', {
        defaultMessage: 'Vega sandbox reported an unknown error.',
      });
  }
};

export const translateVegaSandboxWarning = (warning: VegaSandboxWarningPayload): string => {
  switch (warning.code) {
    case VegaSandboxWarningCode.RuntimeWarning:
      return i18n.translate('visTypeVega.sandbox.runtimeWarningMessage', {
        defaultMessage: 'Vega sandbox warning: {message}',
        values: { message: getMessageValue(warning) },
      });
    default:
      return i18n.translate('visTypeVega.sandbox.unknownWarningMessage', {
        defaultMessage: 'Vega sandbox reported an unknown warning.',
      });
  }
};
