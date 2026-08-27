/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DISCOVER_APP_ID } from '@kbn/deeplinks-analytics';
import { renderHook } from '@testing-library/react';
import { useRegisterDiscoverEsqlFeedback } from './use_register_discover_esql_feedback';
import { useDiscoverServices } from '../../../hooks/use_discover_services';
import { useIsEsqlMode } from './use_is_esql_mode';
import { createDiscoverServicesMock } from '../../../__mocks__/services';
import type { DiscoverServices } from '../../../build_services';

jest.mock('../../../hooks/use_discover_services');
jest.mock('./use_is_esql_mode');

const mockUseDiscoverServices = useDiscoverServices as jest.MockedFunction<
  typeof useDiscoverServices
>;
const mockUseIsEsqlMode = useIsEsqlMode as jest.MockedFunction<typeof useIsEsqlMode>;

const mockServices = (feedback?: DiscoverServices['feedback']) => {
  mockUseDiscoverServices.mockReturnValue({
    ...createDiscoverServicesMock(),
    feedback,
  });
};

describe('useRegisterDiscoverEsqlFeedback', () => {
  it('does nothing when the feedback plugin is not available', () => {
    mockServices(undefined);
    mockUseIsEsqlMode.mockReturnValue(true);

    expect(() => renderHook(() => useRegisterDiscoverEsqlFeedback())).not.toThrow();
  });

  it('registers ES|QL context and unregisters on unmount', () => {
    const unregister = jest.fn();
    const setContext = jest.fn().mockReturnValue(unregister);
    mockServices({ setContext });
    mockUseIsEsqlMode.mockReturnValue(true);

    const { unmount } = renderHook(() => useRegisterDiscoverEsqlFeedback());

    expect(setContext).toHaveBeenCalledWith(
      DISCOVER_APP_ID,
      { isEsql: true },
      { title: 'Analytics - Discover ES|QL' }
    );

    unmount();

    expect(unregister).toHaveBeenCalled();
  });

  it('clears ES|QL context when Discover is in classic mode', () => {
    const setContext = jest.fn().mockReturnValue(jest.fn());
    mockServices({ setContext });
    mockUseIsEsqlMode.mockReturnValue(false);

    renderHook(() => useRegisterDiscoverEsqlFeedback());

    expect(setContext).toHaveBeenCalledWith(DISCOVER_APP_ID, {});
  });
});
