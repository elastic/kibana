/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataSourceProfileProvider } from '../../../../profiles';

/**
 * Security-optimized default app state
 * Provides security-focused default columns and breakdown field
 */
export const createGetDefaultAppState = (): DataSourceProfileProvider['profile']['getDefaultAppState'] =>
  (prev) =>
  () => ({
    ...prev(),
    columns: [
      { name: '@timestamp', width: 212 },
      { name: 'event.action', width: 180 },
      { name: 'event.category', width: 150 },
      { name: 'host.name', width: 150 },
      { name: 'user.name', width: 150 },
      { name: 'source.ip', width: 130 },
      { name: 'destination.ip', width: 130 },
      { name: 'message', width: 300 },
    ],
    breakdownField: 'event.category',
  });
