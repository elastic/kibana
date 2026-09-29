/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

export const logOverallStatusChangesMock = vi.fn();
vi.doMock('./log_overall_status', () => {
      const mocked = {
      logOverallStatusChanges: logOverallStatusChangesMock,
    };
      return { ...mocked, default: mocked };
    });

export const logCoreStatusChangesMock = vi.fn();
vi.doMock('./log_core_services_status', () => {
      const mocked = {
      logCoreStatusChanges: logCoreStatusChangesMock,
    };
      return { ...mocked, default: mocked };
    });

export const logPluginsStatusChangesMock = vi.fn();
vi.doMock('./log_plugins_status', () => {
      const mocked = {
      logPluginsStatusChanges: logPluginsStatusChangesMock,
    };
      return { ...mocked, default: mocked };
    });
