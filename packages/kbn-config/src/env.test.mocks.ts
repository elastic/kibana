/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

const realPath = jest.requireActual('path');

jest.doMock('path', () => ({
  ...realPath,
  resolve(...pathSegments: string[]) {
    return pathSegments.join('/');
  },
  dirname(filePath: string) {
    return '/test/kibanaRoot';
  },
}));

export const mockPackage = {
  raw: {},
};

jest.doMock('load-json-file', () => ({
  sync: () => mockPackage.raw,
}));
