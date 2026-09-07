/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
export interface CloudConnectStatus {
  isCloudConnected: boolean;
  isCloudConnectEisEnabled: boolean;
  isCloudConnectAutoopsEnabled: boolean;
  isLoading: boolean;
  error: Error | null;
}
export interface CloudConnectStatusWithDerived extends CloudConnectStatus {
  isCloudConnectedWithEisEnabled: boolean;
}

export type UseCloudConnectStatusHook = () => CloudConnectStatus;

// Fallback when the cloudConnect plugin is not available
const defaultCloudConnectStatusHook: UseCloudConnectStatusHook = () => ({
  isCloudConnected: false,
  isCloudConnectEisEnabled: false,
  isCloudConnectAutoopsEnabled: false,
  isLoading: true,
  error: null,
});

// Accepts the UseCloudConnectStatusHook from the cloudConnect plugin via dependency injection.
// This package can't access plugin start contracts directly (packages have no plugin lifecycle),
// and cannot depend on x-pack plugins, so consumer plugins pass in cloudConnect?.hooks.useCloudConnectStatus.

// This wrapper centralizes the default status and derives combined values like
// isCloudConnectedWithEisEnabled to avoid repeating that logic across consumers.
export const useCloudConnectStatus = (
  hook?: UseCloudConnectStatusHook
): CloudConnectStatusWithDerived => {
  const cloudConnectStatusHook = useMemo(() => hook ?? defaultCloudConnectStatusHook, [hook]);

  const status = cloudConnectStatusHook();

  return {
    ...status,
    isCloudConnectedWithEisEnabled: status.isCloudConnected && status.isCloudConnectEisEnabled,
  };
};
