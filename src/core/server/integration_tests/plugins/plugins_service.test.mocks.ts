/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export const mockPackage = {
  raw: { __dirname: '/tmp' } as any,
};

jest.doMock('load-json-file', () => ({
  sync: () => mockPackage.raw,
}));

export const mockDiscover = jest.fn();
jest.mock('@kbn/core-plugins-server-internal', () => {
  const realModule = jest.requireActual('@kbn/core-plugins-server-internal');

  return {
    ...realModule,
    discover: mockDiscover,
  };
});

// was:
// export const mockPackage = {
//   raw: { __dirname: '/tmp' } as any,
// };

// jest.doMock('load-json-file', () => ({
//   sync: () => mockPackage.raw,
// }));

// export const mockDiscover = jest.fn();
// jest.mock('../../plugins/discovery/plugins_discovery', () => ({ discover: mockDiscover }));
