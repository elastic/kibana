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
import { Wrapper } from '@kbn/alerts-ui-shared/src/common/test_utils/wrapper';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import * as api from '../apis/get_muted_alerts_instances_by_rule';
import { useGetMutedAlertsQuery } from './use_get_muted_alerts_query';

jest.mock('../apis/get_muted_alerts_instances_by_rule');

const ruleIds = ['a', 'b'];

describe('useGetMutedAlertsQuery', () => {
  const http = httpServiceMock.createStartContract();
  const notifications = notificationServiceMock.createStartContract();
  const addErrorMock = notifications.toasts.addError;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls the api when invoked with the correct parameters', async () => {
    const muteAlertInstanceSpy = jest.spyOn(api, 'getMutedAlertsInstancesByRule');

    renderHook(() => useGetMutedAlertsQuery({ http, notifications, ruleIds }), {
      wrapper: Wrapper,
    });

    await waitFor(() =>
      expect(muteAlertInstanceSpy).toHaveBeenCalledWith(expect.objectContaining({ ruleIds }))
    );
  });

  it('does not call the api if the enabled option is false', async () => {
    const spy = jest.spyOn(api, 'getMutedAlertsInstancesByRule');

    renderHook(() => useGetMutedAlertsQuery({ http, notifications, ruleIds }, { enabled: false }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(spy).not.toHaveBeenCalled());
  });

  it('shows a toast error when the api returns an error', async () => {
    const spy = jest
      .spyOn(api, 'getMutedAlertsInstancesByRule')
      .mockRejectedValue(new Error('An error'));

    renderHook(() => useGetMutedAlertsQuery({ http, notifications, ruleIds }), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(spy).toHaveBeenCalled());
    await waitFor(() => expect(addErrorMock).toHaveBeenCalled());
  });
});
