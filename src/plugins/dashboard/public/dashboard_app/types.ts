/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { AppMountParameters, ScopedHistory } from '@kbn/core-application-browser';
import { MountPoint } from '@kbn/core/public';

export interface DashboardEmbedSettings {
  forceHideDatePicker?: boolean;
  forceHideFilterBar?: boolean;
  forceHideQueryInput?: boolean;
  forceShowTopNavMenu?: boolean;
  showQueryInput?: boolean;
  showDatePicker?: boolean;
  showBorderBottom?: boolean;
  setHeaderActionMenu?: (menuMount: MountPoint<HTMLElement> | undefined) => void;
}

export interface DashboardMountContextProps {
  restorePreviousUrl: () => void;
  scopedHistory: () => ScopedHistory;
  onAppLeave: AppMountParameters['onAppLeave'];
  setHeaderActionMenu: AppMountParameters['setHeaderActionMenu'];
}
