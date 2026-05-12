/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AxiosError } from 'axios';
import { KbnClientRequesterError } from './kbn_client_requester_error';

describe('KbnClientRequesterError', () => {
  it('preserves status when cleaning axios errors (even after stripping response)', () => {
    const original = new AxiosError('Not Found', 'ERR_BAD_REQUEST', undefined, undefined, {
      status: 404,
      statusText: 'Not Found',
      headers: {},
      config: {} as any,
      data: { statusCode: 404 },
    });

    const wrapped = new KbnClientRequesterError('wrapper message', original);

    expect(wrapped.axiosError).toBeDefined();
    expect(wrapped.axiosError!.status).toBe(404);
    expect((wrapped.axiosError as any).response).toBeUndefined();
  });
});
