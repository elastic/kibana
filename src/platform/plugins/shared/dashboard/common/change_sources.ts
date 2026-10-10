/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/** Integrations that can label the dashboard changes they make, for the `dashboard_saved` event. */
export const DASHBOARD_CHANGE_SOURCES = ['agent'] as const;

export type DashboardChangeSource = (typeof DASHBOARD_CHANGE_SOURCES)[number];

const isDashboardChangeSource = (value: unknown): value is DashboardChangeSource =>
  DASHBOARD_CHANGE_SOURCES.some((source) => source === value);

/** Returns the allowed change sources in a value read from browser history state or storage. */
export const parseChangeSources = (value: unknown): DashboardChangeSource[] =>
  Array.isArray(value) ? value.filter(isDashboardChangeSource) : [];
