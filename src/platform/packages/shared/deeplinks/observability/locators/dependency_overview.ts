/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SerializableRecord } from '@kbn/utility-types';

export interface DependencyOverviewParams extends SerializableRecord {
  dependencyName: string;
  environment?: string;
  rangeFrom?: string;
  rangeTo?: string;
}

export const DEPENDENCY_OVERVIEW_LOCATOR_ID = 'dependencyOverviewLocator';
