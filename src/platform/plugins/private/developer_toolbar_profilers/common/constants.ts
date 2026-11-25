/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const API_BASE_PATH = '/internal/developer_toolbar_profilers';

export const PROFILE_TYPES = ['cpu', 'memory'] as const;

export type ProfileType = (typeof PROFILE_TYPES)[number];

export type ProfilerStatusResponse = Readonly<Record<ProfileType, { readonly isRunning: boolean }>>;

/** Returns the base path of the routes for a profile type, e.g. `/internal/developer_toolbar_profilers/cpu_profile`. */
export function getProfileRoutePath(type: ProfileType): string {
  return `${API_BASE_PATH}/${type}_profile`;
}
