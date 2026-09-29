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

import type { CoreService } from '@kbn/core-base-browser-internal';

const createCoreServiceMock = (): Mocked<CoreService> => {
  return {
    setup: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
  };
};

export const styleServiceMock = createCoreServiceMock();
vi.doMock('./styles', () => {
      const mocked = {
      StylesService: vi.fn(() => styleServiceMock),
    };
      return { ...mocked, default: mocked };
    });

export const momentServiceMock = createCoreServiceMock();
vi.doMock('./moment', () => {
      const mocked = {
      MomentService: vi.fn(() => momentServiceMock),
    };
      return { ...mocked, default: mocked };
    });
