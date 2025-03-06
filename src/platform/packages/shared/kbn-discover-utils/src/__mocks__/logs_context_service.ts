/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DEFAULT_ALLOWED_LOGS_BASE_PATTERNS_REGEXP, getLogsContextService } from '../data_types';

export const createLogsContextServiceMock = () => {
  return getLogsContextService({
    allLogsIndexPattern: 'logs-*',
    allowedDataSources: [DEFAULT_ALLOWED_LOGS_BASE_PATTERNS_REGEXP],
  });
};
