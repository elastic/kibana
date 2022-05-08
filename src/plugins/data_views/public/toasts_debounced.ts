/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { debounce } from 'lodash';
import { CoreStart } from 'src/core/public';
import type { OnNotification } from '../common/types';

export const toastsAddDebounced = (
  notifications: CoreStart['notifications'],
  uiSettings: CoreStart['uiSettings']
): OnNotification => {
  const debouncerCollector: Record<string, typeof notifications.toasts.add> = {};
  return (toastInputFields, key) => {
    if (!debouncerCollector[key]) {
      debouncerCollector[key] = debounce(
        notifications.toasts.add,
        uiSettings.get('search:timeout') + 5000,
        {
          leading: true,
        }
      );
    }
    return debouncerCollector[key](toastInputFields);
  };
};
