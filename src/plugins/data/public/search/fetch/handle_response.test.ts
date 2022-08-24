/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { estypes } from '@elastic/elasticsearch';
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
  beforeEach(() => {
    setNotifications(notifications);
    (notifications.toasts.addWarning as jest.Mock).mockReset();
    jest.resetAllMocks();
  });

  test('should notify if timed out', () => {
    const warning = { isTimeout: true, message: 'request timed out', type: 'timeout_warning' };
    const request = { body: {} };
    const response = { rawResponse: { timed_out: true } } as unknown as estypes.SearchResponse;
    handleWarning(warning, request, response, theme);
    expect(notifications.toasts.addWarning).toBeCalled();
    expect((notifications.toasts.addWarning as jest.Mock).mock.calls[0][0].title).toMatch(
      'request timed out'
    );
  });

  test('should notify if shards failed', () => {
    const warning = {
      isShardFailure: true,
      message: 'shards failed',
      type: 'general_search_response_warning',
    };
    const request = { body: {} };
    const response = {
      rawResponse: { _shards: { failed: 1, total: 2, successful: 1, skipped: 1 } },
    } as unknown as estypes.SearchResponse;
    handleWarning(warning, request, response, theme);
    expect(notifications.toasts.addWarning).toBeCalled();
    expect((notifications.toasts.addWarning as jest.Mock).mock.calls[0][0].title).toMatch(
      'shards failed'
    );
  });
});
