/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const mockUuidv4 = jest.fn().mockReturnValue('uuidv4');
const mockUuidv5 = jest.fn().mockReturnValue('uuidv5');
Object.defineProperty(mockUuidv5, 'DNS', { value: 'DNSUUID', writable: false });

jest.mock('uuid', () => ({
  v4: mockUuidv4,
  v5: mockUuidv5,
}));

export { mockUuidv4, mockUuidv5 };
