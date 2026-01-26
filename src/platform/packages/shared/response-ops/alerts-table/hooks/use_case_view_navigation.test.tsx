/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, waitFor, renderHook } from '@testing-library/react';
import { BehaviorSubject } from 'rxjs';
import { applicationServiceMock } from '@kbn/core/public/mocks';
import { useCaseViewNavigation } from './use_case_view_navigation';
import { createTestResponseOpsQueryClient } from '@kbn/response-ops-react-query/test_utils/create_test_response_ops_query_client';

const application = applicationServiceMock.createStartContract();

const { provider: wrapper } = createTestResponseOpsQueryClient();

describe('useCaseViewNavigation', () => {
  const navigateToApp = jest.fn();

  beforeEach(() => {
    application.currentAppId$ = new BehaviorSubject<string>('testAppId');
    application.navigateToApp = navigateToApp;
  });

  it('calls navigateToApp with correct arguments', async () => {
    const { result } = renderHook(() => useCaseViewNavigation(application), {
      wrapper,
    });

    act(() => {
      result.current.navigateToCaseView({ caseId: 'test-id' });
    });

    await waitFor(() =>
      expect(navigateToApp).toHaveBeenCalledWith('testAppId', {
        deepLinkId: 'cases',
        path: '/test-id',
      })
    );
  });

  it('calls navigateToApp with correct arguments and bypass current app id', async () => {
    const { result } = renderHook(() => useCaseViewNavigation(application, 'superAppId'), {
      wrapper,
    });

    act(() => {
      result.current.navigateToCaseView({ caseId: 'test-id' });
    });

    await waitFor(() => {
      expect(navigateToApp).toHaveBeenCalledWith('superAppId', {
        deepLinkId: 'cases',
        path: '/test-id',
      });
    });
  });
});
