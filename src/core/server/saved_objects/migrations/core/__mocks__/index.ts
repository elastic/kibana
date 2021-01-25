/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

const mockUuidv5 = jest.fn().mockReturnValue('uuidv5');
Object.defineProperty(mockUuidv5, 'DNS', { value: 'DNSUUID', writable: false });
jest.mock('uuid/v5', () => mockUuidv5);

export { mockUuidv5 };
