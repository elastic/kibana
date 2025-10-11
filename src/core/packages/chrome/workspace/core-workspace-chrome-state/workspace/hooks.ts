/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RootWorkspaceState } from '../store';
import { useWorkspaceSelector } from '../store';

export const useWorkspaceState = () =>
  useWorkspaceSelector((state: RootWorkspaceState) => state.workspace);

export const useIsLoading = () => useWorkspaceState().isLoading;

export const useCurrentAppId = () => useWorkspaceState().currentAppId;
