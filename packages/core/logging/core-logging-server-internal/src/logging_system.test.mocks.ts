/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { merge, getFlattenedObject } from '@kbn/std';

export const mockStreamWrite = jest.fn();
jest.doMock('fs', () => ({
  ...(jest.requireActual('fs') as any),
  constants: {},
  createWriteStream: jest.fn(() => ({ write: mockStreamWrite })),
}));

export const mockGetFlattenedObject = jest.fn().mockImplementation(getFlattenedObject);
jest.doMock('@kbn/std', () => ({
  merge: jest.fn().mockImplementation(merge),
  getFlattenedObject: mockGetFlattenedObject,
}));
