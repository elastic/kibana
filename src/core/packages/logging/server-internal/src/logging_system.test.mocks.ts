/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import { merge, getFlattenedObject } from '@kbn/std';

export const mockStreamWrite = vi.fn();
vi.doMock('fs', () => {
      const mocked = {
      ...(require('fs') as any),
      constants: {},
      createWriteStream: vi.fn(() => ({ write: mockStreamWrite })),
    };
      return { ...mocked, default: mocked };
    });

export const mockGetFlattenedObject = vi.fn().mockImplementation(getFlattenedObject);
vi.doMock('@kbn/std', () => {
      const mocked = {
      merge: vi.fn().mockImplementation(merge),
      getFlattenedObject: mockGetFlattenedObject,
    };
      return { ...mocked, default: mocked };
    });
