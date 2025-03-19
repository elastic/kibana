/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { i18n } from '@kbn/i18n';
import { RenderErrorHandlerFnType, ExpressionRenderError } from './types';
import { getNotifications } from './services';
import { IInterpreterRenderHandlers } from '../common';

export const renderErrorHandler: RenderErrorHandlerFnType = (
  element: HTMLElement,
  error: ExpressionRenderError,
  handlers: IInterpreterRenderHandlers
) => {
  if (error.name === 'AbortError') {
    handlers.done();
    return;
  }

  getNotifications().toasts.addError(error, {
    title: i18n.translate('expressions.defaultErrorRenderer.errorTitle', {
      defaultMessage: 'Error in visualisation',
    }),
    toastMessage: error.message,
  });
  handlers.done();
};
