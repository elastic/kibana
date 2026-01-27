/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AppMountParameters, ScopedHistory } from '@kbn/core-application-browser';

export interface DashboardEmbedSettings {
  forceHideFilterBar?: boolean;
  forceShowTopNavMenu?: boolean;
  forceShowQueryInput?: boolean;
  forceShowDatePicker?: boolean;
}

export interface DashboardMountContextProps {
  restorePreviousUrl: () => void;
  scopedHistory: () => ScopedHistory;
  onAppLeave: AppMountParameters['onAppLeave'];
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
}

export type DashboardRedirect = (props: RedirectToProps) => void;
/**
 * Properties for redirecting within the dashboard application.
 * Can redirect to either a specific dashboard or the listing page.
 */
export type RedirectToProps =
  | { destination: 'dashboard'; id?: string; useReplace?: boolean; editMode?: boolean }
  | { destination: 'listing'; filter?: string; useReplace?: boolean };
