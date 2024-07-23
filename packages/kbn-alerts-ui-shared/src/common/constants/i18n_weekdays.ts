/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { ISO_WEEKDAYS } from '@kbn/alerting-types';
import moment from 'moment';

export const I18N_WEEKDAY_OPTIONS = ISO_WEEKDAYS.map((n) => ({
  id: String(n),
  label: moment().isoWeekday(n).format('dd'),
}));

export const I18N_WEEKDAY_OPTIONS_DDD = ISO_WEEKDAYS.map((n) => ({
  id: String(n),
  label: moment().isoWeekday(n).format('ddd'),
}));
