/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import type { TransportRequestParams, TransportRequestOptions } from '@elastic/transport';
import type { TransportOptions } from '@elastic/transport/lib/Transport';

export const transportConstructorMock: MockedFunction<(options: TransportOptions) => void> =
  vi.fn();
export const transportRequestMock = vi.fn();

class TransportMock {
  constructor(options: TransportOptions) {
    transportConstructorMock(options);
  }

  request(params: TransportRequestParams, options?: TransportRequestOptions) {
    return transportRequestMock(params, options);
  }
}

vi.doMock('@elastic/elasticsearch', () => {
  const realModule = require('@elastic/elasticsearch');
  return {
    ...realModule,
    Transport: TransportMock,
  };
});
