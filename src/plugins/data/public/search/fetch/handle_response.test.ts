/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { handleResponse } from './handle_response';

// Temporary disable eslint, will be removed after moving to new platform folder
// eslint-disable-next-line @kbn/eslint/no-restricted-paths
import { notificationServiceMock } from '../../../../../core/public/notifications/notifications_service.mock';
import { setNotifications } from '../../services';
import { SearchResponse } from 'elasticsearch';

jest.mock('@kbn/i18n', () => {
  return {
    i18n: {
      translate: (id: string, { defaultMessage }: { defaultMessage: string }) => defaultMessage,
    },
  };
});

describe('handleResponse', () => {
  const notifications = notificationServiceMock.createStartContract();

  beforeEach(() => {
    setNotifications(notifications);
    (notifications.toasts.addWarning as jest.Mock).mockReset();
  });

  test('should notify if timed out', () => {
    const request = { body: {} };
    const response = {
      timed_out: true,
    } as SearchResponse<any>;
    const result = handleResponse(request, response);
    expect(result).toBe(response);
    expect(notifications.toasts.addWarning).toBeCalled();
    expect((notifications.toasts.addWarning as jest.Mock).mock.calls[0][0].title).toMatch(
      'request timed out'
    );
  });

  test('should notify if shards failed', () => {
    const request = { body: {} };
    const response = {
      _shards: {
        failed: 1,
        total: 2,
        successful: 1,
        skipped: 1,
      },
    } as SearchResponse<any>;
    const result = handleResponse(request, response);
    expect(result).toBe(response);
    expect(notifications.toasts.addWarning).toBeCalled();
    expect((notifications.toasts.addWarning as jest.Mock).mock.calls[0][0].title).toMatch(
      'shards failed'
    );
  });

  test('returns the response', () => {
    const request = {};
    const response = {} as SearchResponse<any>;
    const result = handleResponse(request, response);
    expect(result).toBe(response);
  });
});
