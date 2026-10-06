/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type React from 'react';
import type {
  AnalyticsServiceStart,
  AppMountParameters,
  ChromeBreadcrumb,
  ScopedHistory,
  ThemeServiceStart,
} from '@kbn/core/public';
import type { ManagementSection } from '../../utils';
interface ManagementRouterProps {
  history: AppMountParameters['history'];
  theme: ThemeServiceStart;
  setBreadcrumbs: (crumbs?: ChromeBreadcrumb[], appHistory?: ScopedHistory) => void;
  onAppMounted: (id: string) => void;
  sections: ManagementSection[];
  analytics: AnalyticsServiceStart;
}
export declare const ManagementRouter: React.MemoExoticComponent<
  ({
    history,
    setBreadcrumbs,
    onAppMounted,
    sections,
    theme,
    analytics,
  }: ManagementRouterProps) => React.JSX.Element
>;
export {};
