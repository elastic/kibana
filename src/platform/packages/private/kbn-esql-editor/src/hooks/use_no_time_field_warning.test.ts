/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { MapCache } from 'lodash';
import { getResolvedESQLTimeField } from '@kbn/esql-utils';
import { NO_TIME_FIELD_WARNING_CODE, useNoTimeFieldWarning } from './use_no_time_field_warning';

jest.mock('@kbn/esql-utils', () => ({
  ...jest.requireActual('@kbn/esql-utils'),
  getResolvedESQLTimeField: jest.fn(),
}));

const mockGetResolved = jest.mocked(getResolvedESQLTimeField);

const render = (
  query: string,
  { isEnabled = true, columns }: { isEnabled?: boolean; columns?: unknown[] } = {}
) => {
  const esqlFieldsCache = {
    get: jest.fn(() => (columns ? { result: Promise.resolve(columns) } : undefined)),
  } as unknown as MapCache;
  return renderHook(() =>
    useNoTimeFieldWarning({
      query,
      isEnabled,
      isLoading: false,
      pickerProjectRouting: undefined,
      esqlFieldsCache,
    })
  );
};

describe('useNoTimeFieldWarning', () => {
  beforeEach(() => {
    mockGetResolved.mockReset();
  });

  it('warns when the source is resolved without a time field', async () => {
    mockGetResolved.mockResolvedValue({ isResolved: true, timeField: undefined });
    const { result } = render('FROM my_index');

    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(result.current[0].code).toBe(NO_TIME_FIELD_WARNING_CODE);
  });

  it('does not warn when the source has a time field', async () => {
    mockGetResolved.mockResolvedValue({ isResolved: true, timeField: '@timestamp' });
    const { result } = render('FROM my_index');

    await waitFor(() => expect(mockGetResolved).toHaveBeenCalled());
    expect(result.current).toHaveLength(0);
  });

  it('does not warn while the time field is not resolved yet', async () => {
    mockGetResolved.mockResolvedValue({ isResolved: false });
    const { result } = render('FROM my_index');

    await waitFor(() => expect(mockGetResolved).toHaveBeenCalled());
    expect(result.current).toHaveLength(0);
  });

  it('does not warn when the query already uses the time range', async () => {
    const { result } = render('FROM my_index | WHERE date >= ?_tstart AND date < ?_tend');

    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(mockGetResolved).not.toHaveBeenCalled();
    expect(result.current).toHaveLength(0);
  });

  it('does not warn when the query has no source', async () => {
    const { result } = render('ROW a = 1');

    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(mockGetResolved).not.toHaveBeenCalled();
    expect(result.current).toHaveLength(0);
  });

  it('does not warn nor look anything up when disabled', async () => {
    mockGetResolved.mockResolvedValue({ isResolved: true, timeField: undefined });
    const { result } = render('FROM my_index', { isEnabled: false });

    await new Promise((resolve) => setTimeout(resolve, 400));
    expect(mockGetResolved).not.toHaveBeenCalled();
    expect(result.current).toHaveLength(0);
  });

  it('lists the date fields of the source when its columns are already known', async () => {
    mockGetResolved.mockResolvedValue({ isResolved: true, timeField: undefined });
    const { result } = render('FROM my_index | LIMIT 10', {
      columns: [
        { name: 'event.created', type: 'date' },
        { name: 'message', type: 'keyword' },
        { name: 'ingested at', type: 'date_nanos' },
      ],
    });

    await waitFor(() => expect(result.current).toHaveLength(1));
    const { message } = result.current[0];
    expect(message).toContain('(event.created, ingested at)');
    expect(message).toContain('| WHERE event.created >= ?_tstart AND event.created < ?_tend');
    expect(message).not.toContain('message');
  });

  it('falls back to a placeholder when the source has no known date field', async () => {
    mockGetResolved.mockResolvedValue({ isResolved: true, timeField: undefined });
    const { result } = render('FROM my_index', {
      columns: [{ name: 'message', type: 'keyword' }],
    });

    await waitFor(() => expect(result.current).toHaveLength(1));
    expect(result.current[0].message).toContain('<date_field> >= ?_tstart');
  });
});
