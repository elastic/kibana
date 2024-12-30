/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TimefilterContract } from '@kbn/data-plugin/public';
import type { TimeRange, RefreshInterval } from '@kbn/data-plugin/common';
import { savedSearchMock, savedSearchMockWithTimeField } from '../../__mocks__/saved_search';
import { restoreStateFromSavedSearch } from './restore_from_saved_search';

describe('discover restore state from saved search', () => {
  let timefilterMock: TimefilterContract;
  const timeRange: TimeRange = {
    from: 'now-30m',
    to: 'now',
  };
  const refreshInterval: RefreshInterval = {
    value: 5000,
    pause: false,
  };

  beforeEach(() => {
    timefilterMock = {
      setTime: jest.fn(),
      setRefreshInterval: jest.fn(),
    } as unknown as TimefilterContract;
  });

  test('should not update timefilter if attributes are not set', async () => {
    restoreStateFromSavedSearch({
      savedSearch: savedSearchMockWithTimeField,
      timefilter: timefilterMock,
    });

    expect(timefilterMock.setTime).not.toHaveBeenCalled();
    expect(timefilterMock.setRefreshInterval).not.toHaveBeenCalled();
  });

  test('should not update timefilter if timeRestore is disabled', async () => {
    restoreStateFromSavedSearch({
      savedSearch: {
        ...savedSearchMockWithTimeField,
        timeRestore: false,
        timeRange,
        refreshInterval,
      },
      timefilter: timefilterMock,
    });

    expect(timefilterMock.setTime).not.toHaveBeenCalled();
    expect(timefilterMock.setRefreshInterval).not.toHaveBeenCalled();
  });

  test('should update timefilter if timeRestore is enabled', async () => {
    restoreStateFromSavedSearch({
      savedSearch: {
        ...savedSearchMockWithTimeField,
        timeRestore: true,
        timeRange,
        refreshInterval,
      },
      timefilter: timefilterMock,
    });

    expect(timefilterMock.setTime).toHaveBeenCalledWith(timeRange);
    expect(timefilterMock.setRefreshInterval).toHaveBeenCalledWith(refreshInterval);
  });

  test('should not update if data view is not time based', async () => {
    restoreStateFromSavedSearch({
      savedSearch: {
        ...savedSearchMock,
        timeRestore: true,
        timeRange,
        refreshInterval,
      },
      timefilter: timefilterMock,
    });

    expect(timefilterMock.setTime).not.toHaveBeenCalled();
    expect(timefilterMock.setRefreshInterval).not.toHaveBeenCalled();
  });

  test('should not update timefilter if attributes are missing', async () => {
    restoreStateFromSavedSearch({
      savedSearch: {
        ...savedSearchMockWithTimeField,
        timeRestore: true,
      },
      timefilter: timefilterMock,
    });

    expect(timefilterMock.setTime).not.toHaveBeenCalled();
    expect(timefilterMock.setRefreshInterval).not.toHaveBeenCalled();
  });

  test('should not update timefilter if attributes are invalid', async () => {
    restoreStateFromSavedSearch({
      savedSearch: {
        ...savedSearchMockWithTimeField,
        timeRestore: true,
        timeRange: {
          from: 'test',
          to: 'now',
        },
        refreshInterval: {
          pause: false,
          value: -500,
        },
      },
      timefilter: timefilterMock,
    });

    expect(timefilterMock.setTime).not.toHaveBeenCalled();
    expect(timefilterMock.setRefreshInterval).not.toHaveBeenCalled();
  });
});
