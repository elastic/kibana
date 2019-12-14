/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { handleResponse } from './handle_response';
import { toastNotifications } from '../../notify/toasts';

jest.mock('../../notify/toasts', () => {
  return {
    toastNotifications: {
      addWarning: jest.fn(),
    },
  };
});

jest.mock('@kbn/i18n', () => {
  return {
    i18n: {
      translate: (id: string, { defaultMessage }: { defaultMessage: string }) => defaultMessage,
    },
  };
});

describe('handleResponse', () => {
  beforeEach(() => {
    (toastNotifications.addWarning as jest.Mock).mockReset();
  });

  test('should notify if timed out', () => {
    const request = { body: {} };
    const response = {
      timed_out: true,
    };
    const result = handleResponse(request, response);
    expect(result).toBe(response);
    expect(toastNotifications.addWarning).toBeCalled();
    expect((toastNotifications.addWarning as jest.Mock).mock.calls[0][0].title).toMatch(
      'request timed out'
    );
  });

  test('should notify if shards failed', () => {
    const request = { body: {} };
    const response = {
      _shards: {
        failed: true,
      },
    };
    const result = handleResponse(request, response);
    expect(result).toBe(response);
    expect(toastNotifications.addWarning).toBeCalled();
    expect((toastNotifications.addWarning as jest.Mock).mock.calls[0][0].title).toMatch(
      'shards failed'
    );
  });

  test('returns the response', () => {
    const request = {};
    const response = {};
    const result = handleResponse(request, response);
    expect(result).toBe(response);
  });
});
