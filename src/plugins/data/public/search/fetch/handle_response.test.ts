/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { themeServiceMock } from '@kbn/core/public/mocks';
import { setNotifications } from '../../services';
import { handleWarning } from './handle_response';

jest.mock('@kbn/i18n', () => {
  return {
    i18n: {
      translate: (_id: string, { defaultMessage }: { defaultMessage: string }) => defaultMessage,
    },
  };
});

const theme = themeServiceMock.createStartContract();

describe('handleWarning', () => {
  const notifications = notificationServiceMock.createStartContract();
  const warning = {
    type: 'timed_out',
    message: 'this stuff timed out on us',
  };

  beforeEach(() => {
    setNotifications(notifications);
    (notifications.toasts.addWarning as jest.Mock).mockReset();
    jest.resetAllMocks();
  });

  test('should notify if timed out', () => {
    const request = { body: {} };
    const response = {
      rawResponse: {
        timed_out: true,
      },
    };
    const result = handleWarning(warning, request, response, theme);
    expect(result).toBe(response);
    expect(notifications.toasts.addWarning).toBeCalled();
    expect((notifications.toasts.addWarning as jest.Mock).mock.calls[0][0].title).toMatch(
      'request timed out'
    );
  });

  test('should notify if shards failed', () => {
    const request = { body: {} };
    const response = {
      rawResponse: {
        _shards: {
          failed: 1,
          total: 2,
          successful: 1,
          skipped: 1,
        },
      },
    };
    const result = handleWarning(warning, request, response, theme);
    expect(result).toBe(response);
    expect(notifications.toasts.addWarning).toBeCalled();
    expect((notifications.toasts.addWarning as jest.Mock).mock.calls[0][0].title).toMatch(
      'shards failed'
    );
  });

  test('returns the response', () => {
    const request = {};
    const response = {
      rawResponse: {},
    };
    const result = handleWarning(warning, request, response, theme);
    expect(result).toBe(response);
  });
});
