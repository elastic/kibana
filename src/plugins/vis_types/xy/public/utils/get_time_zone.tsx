/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import moment from 'moment';

import { getUISettings } from '../services';

/**
 * Get timeZone from uiSettings
 */
export function getTimeZone() {
  const uiSettings = getUISettings();
  if (uiSettings.isDefault('dateFormat:tz')) {
    const detectedTimeZone = moment.tz.guess();
    if (detectedTimeZone) return detectedTimeZone;
    else return moment().format('Z');
  } else {
    return uiSettings.get('dateFormat:tz', 'Browser');
  }
}
