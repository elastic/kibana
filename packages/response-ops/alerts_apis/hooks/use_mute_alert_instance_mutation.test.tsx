/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import { wrapper } from '@kbn/alerts-ui-shared/src/common/test_utils/wrapper';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import * as api from '../apis/mute_alert_instance';
import { useMuteAlertInstanceMutation } from './use_mute_alert_instance_mutation';

jest.mock('../apis/mute_alert_instance');

const params = { ruleId: '', alertInstanceId: '' };

describe('useMuteAlertInstanceMutation', () => {
  const http = httpServiceMock.createStartContract();
  const notifications = notificationServiceMock.createStartContract();
  const addErrorMock = notifications.toasts.addError;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the api when invoked with the correct parameters', async () => {
    const muteAlertInstanceSpy = jest.spyOn(api, 'muteAlertInstance');

    const { result } = renderHook(() => useMuteAlertInstanceMutation({ http, notifications }), {
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
    const spy = jest.spyOn(api, 'muteAlertInstance').mockRejectedValue(new Error('An error'));

    const { result } = renderHook(() => useMuteAlertInstanceMutation({ http, notifications }), {
      wrapper,
    });

    result.current.mutate(params);

    await waitFor(() => {
      expect(spy).toHaveBeenCalled();
      expect(addErrorMock).toHaveBeenCalled();
    });
  });
});
