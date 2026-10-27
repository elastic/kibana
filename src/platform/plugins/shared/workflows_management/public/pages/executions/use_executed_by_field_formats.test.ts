/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import { of } from 'rxjs';
import { useExecutedByFieldFormats } from './use_executed_by_field_formats';

const mockSearch = jest.fn();
const mockUseUiSetting = jest.fn();
const mockUseUserProfilesByUid = jest.fn();
let mockCloud: { isServerlessEnabled: boolean } | undefined;

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useUiSetting: (...args: unknown[]) => mockUseUiSetting(...args),
}));

jest.mock('../../hooks/use_kibana', () => ({
  useKibana: () => ({ services: { cloud: mockCloud, data: { search: { search: mockSearch } } } }),
}));

jest.mock('../../entities/user_profiles', () => ({
  getExecutedByLabel: (profile?: { user: { username: string } }, fallback?: string) =>
    profile?.user.username ?? fallback,
  useUserProfilesByUid: (...args: unknown[]) => mockUseUserProfilesByUid(...args),
}));

jest.mock('@kbn/react-query', () => ({
  useQuery: (_key: unknown, queryFn: () => Promise<string[]>) => {
    const React = jest.requireActual('react');
    const [data, setData] = React.useState(undefined);
    React.useEffect(() => {
      queryFn().then(setData);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps
    return { data, isFetching: data === undefined };
  },
}));

const getLookupEntries = (
  result: ReturnType<typeof useExecutedByFieldFormats>
): Array<{ key: string; value: string }> =>
  result.fieldFormats.executedBy.params?.lookupEntries as Array<{ key: string; value: string }>;

describe('useExecutedByFieldFormats', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCloud = { isServerlessEnabled: false };
    mockUseUiSetting.mockReturnValue(true);
    mockSearch.mockReturnValue(
      of({
        rawResponse: {
          aggregations: { executedByValues: { buckets: [{ key: 'u_1' }, { key: 'u_2' }] } },
        },
      })
    );
    mockUseUserProfilesByUid.mockReturnValue({
      data: new Map([['u_1', { uid: 'u_1', user: { username: 'elastic' } }]]),
      isFetching: false,
    });
  });

  it('is ready when there are no executors, even if the profile query is idle', async () => {
    mockSearch.mockReturnValue(of({ rawResponse: { aggregations: {} } }));
    mockUseUserProfilesByUid.mockReturnValue({ data: undefined, isFetching: false });
    const { result } = renderHook(() => useExecutedByFieldFormats({ spaceId: 'default' }));

    await waitFor(() => expect(result.current.isReady).toBe(true));
  });

  it('maps profile UIDs to display names and falls back to the raw value when unresolved', async () => {
    const { result } = renderHook(() => useExecutedByFieldFormats({ spaceId: 'default' }));

    await waitFor(() => expect(result.current.isReady).toBe(true));

    expect(getLookupEntries(result.current)).toEqual([
      { key: 'u_1', value: 'elastic' },
      { key: 'u_2', value: 'u_2' },
    ]);
  });

  it('does not expose unresolved identifiers on serverless', async () => {
    mockCloud = { isServerlessEnabled: true };
    const { result } = renderHook(() => useExecutedByFieldFormats({ spaceId: 'default' }));

    await waitFor(() => expect(result.current.isReady).toBe(true));

    expect(getLookupEntries(result.current)[1]).toEqual({ key: 'u_2', value: 'Unknown user 2' });
    expect(result.current.fieldFormats.executedBy.params?.unknownKeyValue).toBe('Unknown user');
  });

  it('does not resolve profiles or expose identifiers when the show executor setting is off', async () => {
    mockUseUiSetting.mockReturnValue(false);
    const { result } = renderHook(() => useExecutedByFieldFormats({ spaceId: 'default' }));

    await waitFor(() => expect(result.current.isReady).toBe(true));

    expect(mockUseUserProfilesByUid).toHaveBeenCalledWith(
      expect.objectContaining({ enabled: false })
    );
    expect(getLookupEntries(result.current).map(({ value }) => value)).toEqual([
      'Unknown user 1',
      'Unknown user 2',
    ]);
    expect(result.current.fieldFormats.executedBy.params?.unknownKeyValue).toBe('Unknown user');
  });
});
