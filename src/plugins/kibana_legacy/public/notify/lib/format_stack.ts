/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

// browsers format Error.stack differently; always include message
export function formatStack(err: Record<string, any>) {
  if (err.stack && err.stack.indexOf(err.message) === -1) {
    return i18n.translate('kibana_legacy.notify.toaster.errorMessage', {
      defaultMessage: `Error: {errorMessage}
      {errorStack}`,
      values: {
        errorMessage: err.message,
        errorStack: err.stack,
      },
    });
  }
  return err.stack;
}
