/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const realStages = jest.requireActual('./stages');

export const StageMocks = Object.keys(realStages).reduce((mocks, key) => {
  mocks[key] = jest.fn().mockImplementation((state: unknown) => state);
  return mocks;
}, {} as Record<string, jest.MockedFunction<any>>);

jest.doMock('./stages', () => {
  return StageMocks;
});
