/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const getSavedObjectFromSourceMock = jest.fn();
export const isFoundGetResponseMock = jest.fn();
export const rawDocExistsInNamespaceMock = jest.fn();

jest.doMock('./utils', () => {
  const actual = jest.requireActual('./utils');
  return {
    ...actual,
    isFoundGetResponse: isFoundGetResponseMock,
    getSavedObjectFromSource: getSavedObjectFromSourceMock,
    rawDocExistsInNamespace: rawDocExistsInNamespaceMock,
  };
});
