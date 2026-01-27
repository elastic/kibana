/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { useUnmuteAlertInstance } from './use_unmute_alert_instance';
import * as api from '../apis/unmute_alert_instance';
import { createTestResponseOpsQueryClient } from '@kbn/response-ops-react-query/test_utils/create_test_response_ops_query_client';

jest.mock('../apis/unmute_alert_instance');

const params = { ruleId: '', alertInstanceId: '' };

const { provider: wrapper } = createTestResponseOpsQueryClient();

describe('useUnmuteAlertInstance', () => {
  const http = httpServiceMock.createStartContract();
  const notifications = notificationServiceMock.createStartContract();
  const addErrorMock = notifications.toasts.addError;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the api when invoked with the correct parameters', async () => {
    const muteAlertInstanceSpy = jest.spyOn(api, 'unmuteAlertInstance');

    const { result } = renderHook(() => useUnmuteAlertInstance({ http, notifications }), {
      wrapper,
    });

    result.current.mutate(params);

    await waitFor(() => {
      expect(muteAlertInstanceSpy).toHaveBeenCalledWith({
        id: params.ruleId,
        instanceId: params.alertInstanceId,
        http: expect.anything(),
      });
    });
  });

  it('shows a toast error when the api returns an error', async () => {
    const spy = jest.spyOn(api, 'unmuteAlertInstance').mockRejectedValue(new Error('An error'));

    const { result } = renderHook(() => useUnmuteAlertInstance({ http, notifications }), {
      wrapper,
    });

    result.current.mutate(params);

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
      expect(addErrorMock).toHaveBeenCalled();
    });
  });
});
