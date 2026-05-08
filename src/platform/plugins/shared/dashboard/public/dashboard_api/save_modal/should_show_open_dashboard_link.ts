/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DASHBOARD_APP_ID } from '../../../common/page_bundle_constants';

interface ShouldShowOpenDashboardLinkParams {
  /**
   * The id of the app the user is currently focused on, sourced from
   * `coreServices.application.currentAppId$`. May be `undefined` during
   * early app bootstrap.
   */
  currentAppId: string | undefined;
  /**
   * The dashboard the user is currently viewing/editing. In the save flow
   * this is `lastSavedId` (the dashboard that was on screen when the save
   * was initiated). It is `undefined` when creating a brand new dashboard.
   */
  viewedDashboardId: string | undefined;
  /** The id returned by the save call, i.e. the dashboard that was just saved. */
  savedDashboardId: string;
}

/**
 * Determines whether the "View dashboard" link should be shown in the
 * dashboard save success toast.
 *
 * The link is hidden only when the user is already viewing the saved
 * dashboard inside the Dashboard app, where opening it again would be a
 * no-op. Every other context (chat sidebar, portable dashboard flyouts,
 * other apps) gets the link.
 */
export const shouldShowOpenDashboardLink = ({
  currentAppId,
  viewedDashboardId,
  savedDashboardId,
}: ShouldShowOpenDashboardLinkParams): boolean => {
  const isInDashboardApp = currentAppId === DASHBOARD_APP_ID;
  const isViewingSavedDashboard = viewedDashboardId === savedDashboardId;
  return !(isInDashboardApp && isViewingSavedDashboard);
};
