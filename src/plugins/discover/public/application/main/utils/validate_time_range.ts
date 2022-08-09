/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { i18n } from '@kbn/i18n';
import { ToastsStart } from '@kbn/core/public';
import { isTimeRangeValid } from '../../../utils/validate_time';

/**
 * Validates a given time filter range, provided by URL or UI
 * Unless valid, it returns false and displays a notification
 */
export function validateTimeRange(
  { from, to }: { from: string; to: string },
  toastNotifications: ToastsStart
): boolean {
  if (!isTimeRangeValid({ from, to })) {
    toastNotifications.addDanger({
      title: i18n.translate('discover.notifications.invalidTimeRangeTitle', {
        defaultMessage: `Invalid time range`,
      }),
      text: i18n.translate('discover.notifications.invalidTimeRangeText', {
        defaultMessage: `The provided time range is invalid. (from: '{from}', to: '{to}')`,
        values: {
          from,
          to,
        },
      }),
    });
    return false;
  }
  return true;
}
