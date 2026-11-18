/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Mock } from 'vitest';
import { merge, getFlattenedObject } from '@kbn/std';

export const mockStreamWrite: Mock = vi.fn();
vi.doMock('fs', async () => ({
  ...((await vi.importActual('fs')) as any),
  constants: {},
  createWriteStream: vi.fn(() => ({ write: mockStreamWrite })),
}));

export const mockGetFlattenedObject: Mock = vi.fn().mockImplementation(getFlattenedObject);
vi.doMock('@kbn/std', () => ({
  merge: vi.fn().mockImplementation(merge),
  getFlattenedObject: mockGetFlattenedObject,
}));
