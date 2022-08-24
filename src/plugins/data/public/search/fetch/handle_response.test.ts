/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { handleWarning, WarningHandlerCallback } from './handle_response';

// Temporary disable eslint, will be removed after moving to new platform folder
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { setNotifications } from '../../services';
import { SearchSourceSearchOptions } from '../../../common';
import { themeServiceMock } from '@kbn/core/public/mocks';

jest.mock('@kbn/i18n', () => {
  return {
    i18n: {
      translate: (_id: string, { defaultMessage }: { defaultMessage: string }) => defaultMessage,
    },
  };
});

const theme = themeServiceMock.createStartContract();

describe('handleResponse', () => {
  const notifications = notificationServiceMock.createStartContract();
  let callback: WarningHandlerCallback | undefined;
  let options: SearchSourceSearchOptions;

  beforeEach(() => {
    setNotifications(notifications);
    (notifications.toasts.addWarning as jest.Mock).mockReset();
    options = { disableShardFailureWarning: false };
    jest.resetAllMocks();
  });

  test('should notify if timed out', () => {
    const request = { body: {} };
    const response = {
      rawResponse: {
        timed_out: true,
      },
    };
    const result = handleWarning(request, response, options, callback, theme);
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
    const result = handleWarning(request, response, options, callback, theme);
    expect(result).toBe(response);
    expect(notifications.toasts.addWarning).toBeCalled();
    expect((notifications.toasts.addWarning as jest.Mock).mock.calls[0][0].title).toMatch(
      'shards failed'
    );
  });

  test('should not notify of shards failed if disableShardFailureWarning is true', () => {
    options.disableShardFailureWarning = true;

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
    const result = handleWarning(request, response, options, callback, theme);
    expect(result).toBe(response);
    expect(notifications.toasts.addWarning).not.toBeCalled();
  });

  test('returns the response', () => {
    const request = {};
    const response = {
      rawResponse: {},
    };
    const result = handleWarning(request, response, options, callback, theme);
    expect(result).toBe(response);
  });

  describe('using WarningHandlerCallback', () => {
    test('can return true to prevent default behavior', () => {
      callback = jest.fn(() => true);

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

      handleWarning(request, response, options, callback, theme);
      expect(callback).toBeCalledWith({
        isShardFailure: true,
        message: '{shardsFailed} of {shardsTotal} shards failed',
        text: 'The data you are seeing might be incomplete or wrong.',
        type: 'generic_shard_warning',
      });
      expect(notifications.toasts.addWarning).not.toBeCalled();
    });

    test('can return false to allow default behavior', () => {
      callback = jest.fn(() => false);

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

      handleWarning(request, response, options, callback, theme);
      expect(callback).toBeCalledWith({
        isShardFailure: true,
        message: '{shardsFailed} of {shardsTotal} shards failed',
        text: 'The data you are seeing might be incomplete or wrong.',
        type: 'generic_shard_warning',
      });
      expect(notifications.toasts.addWarning).toBeCalled();
    });
  });
});
