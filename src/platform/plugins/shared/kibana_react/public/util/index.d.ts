/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import { type Observable } from 'rxjs';
import type { MountPoint } from '@kbn/core/public';
import type { AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import type { CoreTheme } from '@kbn/core-theme-browser';
import type { UserProfileService } from '@kbn/core-user-profile-browser';
/**
 * @deprecated use `ToMountPointParams` from `@kbn/react-kibana-mount`
 */
export interface ToMountPointOptions {
  analytics?: AnalyticsServiceStart;
  theme$?: Observable<CoreTheme>;
  userProfile?: UserProfileService;
}
/**
 * @deprecated use `toMountPoint` from `@kbn/react-kibana-mount`
 */
export declare const toMountPoint: (
  node: React.ReactNode,
  { analytics, theme$, userProfile }?: ToMountPointOptions
) => MountPoint;
