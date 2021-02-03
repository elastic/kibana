/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

const mockUuidv4 = jest.fn().mockReturnValue('uuidv4');
jest.mock('uuid', () => ({
  v4: mockUuidv4,
}));

export { mockUuidv4 };
