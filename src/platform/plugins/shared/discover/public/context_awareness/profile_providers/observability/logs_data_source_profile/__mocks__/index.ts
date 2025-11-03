/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ExtractResolutionMatch } from '../../../../profile_service';
import { DataSourceCategory } from '../../../../profiles';
import type { LogOverviewContext, LogsDataSourceProfileProvider } from '../profile';
import { BehaviorSubject } from 'rxjs';

export const RESOLUTION_MATCH: ExtractResolutionMatch<LogsDataSourceProfileProvider> = {
  isMatch: true,
  context: {
    category: DataSourceCategory.Logs,
    logOverviewContext$: new BehaviorSubject<LogOverviewContext | undefined>(undefined),
  },
};
