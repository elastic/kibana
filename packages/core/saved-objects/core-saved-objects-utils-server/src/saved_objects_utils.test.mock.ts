/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const mockUuidv1 = jest.fn().mockReturnValue('uuidv1');
const mockUuidv5 = jest.fn().mockReturnValue('uuidv5');
Object.defineProperty(mockUuidv5, 'DNS', { value: 'DNSUUID', writable: false });

jest.mock('uuid', () => ({
  v1: mockUuidv1,
  v5: mockUuidv5
}));

export { mockUuidv1, mockUuidv5 };
