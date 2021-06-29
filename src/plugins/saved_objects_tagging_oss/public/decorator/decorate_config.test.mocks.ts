/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const injectTagReferencesMock = jest.fn();
jest.doMock('./inject_tag_references', () => ({
  injectTagReferences: injectTagReferencesMock,
}));

export const extractTagReferencesMock = jest.fn();
jest.doMock('./extract_tag_references', () => ({
  extractTagReferences: extractTagReferencesMock,
}));
