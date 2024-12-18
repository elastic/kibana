/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import moment from 'moment-timezone';

export const TIMEZONE_OPTIONS = [
  ...moment.tz
    .names()
    // We need to filter out some time zones, that moment.js knows about, but Elasticsearch
    // does not understand and would fail thus with a 400 bad request when using them.
    .filter((tz) => !['America/Nuuk', 'EST', 'HST', 'ROC', 'MST'].includes(tz)),
];
