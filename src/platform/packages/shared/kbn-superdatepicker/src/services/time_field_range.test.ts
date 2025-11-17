/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getTimeFieldRange } from './time_field_range';
import { TIME_FIELD_RANGE_ENDPOINT } from '../constants';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';

const mockHttp = httpServiceMock.createStartContract();

describe('getTimeFieldRange', () => {
  it('should call http.fetch with correct parameters', async () => {
    const options = {
      index: 'test-index-*',
      timeFieldName: '@timestamp',
      http: mockHttp,
    };

    await getTimeFieldRange(options);

    expect(mockHttp.fetch).toHaveBeenCalledWith({
      path: TIME_FIELD_RANGE_ENDPOINT,
      method: 'POST',
      body: JSON.stringify({
        index: 'test-index-*',
        timeFieldName: '@timestamp',
      }),
      version: '1',
    });
  });
});
