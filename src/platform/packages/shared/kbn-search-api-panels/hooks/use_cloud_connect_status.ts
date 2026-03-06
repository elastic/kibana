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

const defaultCloudConnectStatusHook: UseCloudConnectStatusHook = () => ({
  isCloudConnected: false,
  isCloudConnectEisEnabled: false,
  isCloudConnectAutoopsEnabled: false,
  isLoading: false,
  error: null,
});

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
