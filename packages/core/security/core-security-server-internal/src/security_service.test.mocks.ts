/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const getDefaultSecurityImplementationMock = jest.fn();
export const convertSecurityApiMock = jest.fn();

jest.doMock('./utils', () => {
  const actual = jest.requireActual('./utils');
  return {
    ...actual,
    getDefaultSecurityImplementation: getDefaultSecurityImplementationMock,
    convertSecurityApi: convertSecurityApiMock,
  };
});
