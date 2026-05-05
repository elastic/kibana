/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useSyncExternalStore } from 'react';
import { getDashboardBackupService } from '../services/dashboard_api_services';

// In-memory pub/sub bridging the singleton dashboard backup service to React.
// `getDashboardBackupService().getDashboardIdsWithUnsavedChanges()` returns a
// referentially stable array when its contents are unchanged, so we can use
// it directly as the `useSyncExternalStore` snapshot without extra caching.
const listeners = new Set<() => void>();

const subscribeToUnsavedDashboards = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getUnsavedDashboardIdsSnapshot = (): readonly string[] =>
  getDashboardBackupService().getDashboardIdsWithUnsavedChanges();

/**
 * Notify subscribers that the dashboard backup service may have new contents.
 *
 * Call after any mutation that can change the set of unsaved-dashboard IDs
 * (delete, save, discard, restore). The backing service has no event
 * channel of its own, so callsites must opt in here.
 */
export const notifyUnsavedDashboardsChanged = () => {
  listeners.forEach((listener) => listener());
};

/**
 * React hook returning the current set of dashboard IDs with unsaved local
 * edits. Re-renders the consumer whenever {@link notifyUnsavedDashboardsChanged}
 * is called.
 */
export const useUnsavedDashboardIds = (): readonly string[] =>
  useSyncExternalStore(subscribeToUnsavedDashboards, getUnsavedDashboardIdsSnapshot);
