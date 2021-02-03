/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export const mockPackage = new Proxy({ raw: {} as any }, { get: (obj, prop) => obj.raw[prop] });
jest.mock('../../../package.json', () => mockPackage);

export const mockApplyDeprecations = jest.fn((config, deprecations, log) => config);
jest.mock('./deprecation/apply_deprecations', () => ({
  applyDeprecations: mockApplyDeprecations,
}));
