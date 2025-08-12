/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup } from '@kbn/core/public';
import type { PerformanceMetricEvent } from '@kbn/ebt-tools';
import type { BehaviorSubject } from 'rxjs';

export interface DiscoverEBTContextProps {
  discoverProfiles: string[]; // Discover Context Awareness Profiles
}
export type DiscoverEBTContext = BehaviorSubject<DiscoverEBTContextProps>;

export type ReportEvent = CoreSetup['analytics']['reportEvent'];

export type ReportPerformanceEvent = (eventData: PerformanceMetricEvent) => void;

export type UpdateProfilesContextWith = (
  discoverProfiles: DiscoverEBTContextProps['discoverProfiles']
) => void;

export type SetAsActiveManager = () => void;
