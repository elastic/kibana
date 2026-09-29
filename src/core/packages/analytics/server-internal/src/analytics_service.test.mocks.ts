/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mocked } from 'vitest';

import type { AnalyticsClient } from '@elastic/ebt/client';
import { Subject } from 'rxjs';
import { lazyObject } from '@kbn/lazy-object';

export const analyticsClientMock: Mocked<AnalyticsClient> = lazyObject({
  optIn: vi.fn(),
  reportEvent: vi.fn(),
  registerEventType: vi.fn(),
  registerContextProvider: vi.fn(),
  removeContextProvider: vi.fn(),
  registerShipper: vi.fn(),
  telemetryCounter$: new Subject(),
  shutdown: vi.fn(),
  flush: vi.fn(),
});

vi.doMock('@elastic/ebt/client', () => {
      const mocked = {
      createAnalytics: () => analyticsClientMock,
    };
      return { ...mocked, default: mocked };
    });
