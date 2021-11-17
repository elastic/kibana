/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';
import type { IUiSettingsClient } from '../../../../../core/public';

/**
 * Get timeZone from uiSettings
 */
export function getTimeZone(uiSettings: IUiSettingsClient) {
  if (uiSettings.isDefault('dateFormat:tz')) {
    const detectedTimeZone = moment.tz.guess();
    return detectedTimeZone || moment().format('Z');
  } else {
    return uiSettings.get('dateFormat:tz', 'Browser');
  }
}
