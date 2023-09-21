/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { SerializableRecord } from '@kbn/utility-types';

export const OBSERVABILITY_ONBOARDING_LOCATOR = 'OBSERVABILITY_ONBOARDING_LOCATOR' as const;

export interface ObservabilityOnboardingLocatorParams extends SerializableRecord {
  /** If given, it will load the given map else will load the create a new map page. */
  source?: 'customLogs' | 'systemLogs';
}
