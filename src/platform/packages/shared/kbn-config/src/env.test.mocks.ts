/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const realPath = jest.requireActual('path');
const realFs = jest.requireActual('fs');

jest.doMock('path', () => ({
  ...realPath,
  dirname(filePath: string) {
    return '/test/kibanaRoot';
  },
}));

export const mockPackage = {
  raw: {},
};

jest.doMock('fs', () => ({
  ...realFs,
  readFileSync: (filePath: string, options?: unknown) => {
    if (filePath === '/test/kibanaRoot/package.json') {
      return JSON.stringify(mockPackage.raw);
    }
    return realFs.readFileSync(filePath, options);
  },
}));
