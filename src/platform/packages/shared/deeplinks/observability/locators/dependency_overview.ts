/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { SerializableRecord } from '@kbn/utility-types';

export interface DependencyOverviewParams extends SerializableRecord {
  dependencyName: string;
  environment?: string;
  rangeFrom?: string;
  rangeTo?: string;
}

export const DEPENDENCY_OVERVIEW_LOCATOR_ID = 'dependencyOverviewLocator';

