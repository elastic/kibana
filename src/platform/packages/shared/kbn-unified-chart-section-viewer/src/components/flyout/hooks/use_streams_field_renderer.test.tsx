/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import type { DiscoverSharedPublicStart } from '@kbn/discover-shared-plugin/public';
import { useExternalServices } from '../../../context/external_services';
import { useStreamsFieldRenderer } from './use_streams_field_renderer';

jest.mock('../../../context/external_services', () => ({
  useExternalServices: jest.fn(),
}));

const mockedUseExternalServices = useExternalServices as jest.Mock;

const buildDiscoverShared = (getById: jest.Mock): DiscoverSharedPublicStart =>
  ({ features: { registry: { getById } } } as unknown as DiscoverSharedPublicStart);

describe('useStreamsFieldRenderer', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns undefined when there are no external services', () => {
    mockedUseExternalServices.mockReturnValue(undefined);
    const { result } = renderHook(() => useStreamsFieldRenderer());
    expect(result.current).toBeUndefined();
  });

  it('returns undefined when discoverShared is missing', () => {
    mockedUseExternalServices.mockReturnValue({});
    const { result } = renderHook(() => useStreamsFieldRenderer());
    expect(result.current).toBeUndefined();
  });

  it('returns undefined when the streams feature is not registered', () => {
    const getById = jest.fn().mockReturnValue(undefined);
    mockedUseExternalServices.mockReturnValue({ discoverShared: buildDiscoverShared(getById) });

    const { result } = renderHook(() => useStreamsFieldRenderer());

    expect(result.current).toBeUndefined();
    expect(getById).toHaveBeenCalledWith('streams');
  });

  it('returns the renderer registered under the streams feature (same identity)', () => {
    const renderFlyoutStreamFieldByStreamName = jest.fn();
    const getById = jest.fn().mockReturnValue({
      id: 'streams',
      renderFlyoutStreamFieldByStreamName,
    });
    mockedUseExternalServices.mockReturnValue({ discoverShared: buildDiscoverShared(getById) });

    const { result } = renderHook(() => useStreamsFieldRenderer());

    expect(result.current).toBe(renderFlyoutStreamFieldByStreamName);
    expect(getById).toHaveBeenCalledWith('streams');
  });
});
