/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { TransportRequestParams, TransportRequestOptions } from '@elastic/transport';
import type { TransportOptions } from '@elastic/transport/lib/Transport';

export const transportConstructorMock: jest.MockedFunction<(options: TransportOptions) => void> =
  jest.fn();
export const transportRequestMock = jest.fn();

class TransportMock {
  constructor(options: TransportOptions) {
    transportConstructorMock(options);
  }

  request(params: TransportRequestParams, options?: TransportRequestOptions) {
    return transportRequestMock(params, options);
  }
}

jest.doMock('@elastic/elasticsearch', () => {
  const realModule = jest.requireActual('@elastic/elasticsearch');
  return {
    ...realModule,
    Transport: TransportMock,
  };
});
