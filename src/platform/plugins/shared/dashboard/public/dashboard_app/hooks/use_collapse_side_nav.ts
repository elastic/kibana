/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect } from 'react';

import { coreServices } from '../../services/kibana_services';

let hasUserManualSideNavPreference = false;

/**
 * Clears the dashboards-only side nav preference so the app auto-collapses again on next entry.
 * Called when the dashboards app unmounts (e.g. navigating to another primary nav item).
 */
export const resetDashboardSideNavAutoCollapsePreference = () => {
  hasUserManualSideNavPreference = false;
};

/**
 * Collapse the project side nav when entering the dashboards app to maximize canvas space.
 * If the user manually toggles the nav while in dashboards, that preference is kept until
 * they leave the app.
 */
export const useCollapseSideNav = (enabled = true) => {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    let pendingProgrammaticCollapse = false;

    if (!hasUserManualSideNavPreference) {
      pendingProgrammaticCollapse = true;
      coreServices.chrome.sideNav.setIsCollapsed(true);
    }

    const subscription = coreServices.chrome.sideNav.getIsCollapsed$().subscribe(() => {
      if (pendingProgrammaticCollapse) {
        pendingProgrammaticCollapse = false;
        return;
      }

      hasUserManualSideNavPreference = true;
    });

    return () => subscription.unsubscribe();
  }, [enabled]);
};
