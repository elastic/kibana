/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TimeRange, RefreshInterval } from '@kbn/data-plugin/common';
import { savedSearchMock, savedSearchMockWithTimeField } from '../../../../__mocks__/saved_search';
import { restoreStateFromSavedSearch } from './restore_from_saved_search';

describe('discover restore state from saved search', () => {
  const timeRange: TimeRange = {
    from: 'now-30m',
    to: 'now',
  };
  const refreshInterval: RefreshInterval = {
    value: 5000,
    pause: false,
  };

  test('should not update timefilter if attributes are not set', async () => {
    const globalState = restoreStateFromSavedSearch({ savedSearch: savedSearchMockWithTimeField });

    expect(globalState).toEqual({});
  });

  test('should not update timefilter if timeRestore is disabled', async () => {
    const globalState = restoreStateFromSavedSearch({
      savedSearch: {
        ...savedSearchMockWithTimeField,
        timeRestore: false,
        timeRange,
        refreshInterval,
      },
    });

    expect(globalState).toEqual({});
  });

  test('should update timefilter if timeRestore is enabled', async () => {
    const globalState = restoreStateFromSavedSearch({
      savedSearch: {
        ...savedSearchMockWithTimeField,
        timeRestore: true,
        timeRange,
        refreshInterval,
      },
    });

    expect(globalState).toEqual({
      timeRange,
      refreshInterval,
    });
  });

  test('should not update if data view is not time based', async () => {
    const globalState = restoreStateFromSavedSearch({
      savedSearch: {
        ...savedSearchMock,
        timeRestore: true,
        timeRange,
        refreshInterval,
      },
    });

    expect(globalState).toEqual({});
  });

  test('should not update timefilter if attributes are missing', async () => {
    const globalState = restoreStateFromSavedSearch({
      savedSearch: {
        ...savedSearchMockWithTimeField,
        timeRestore: true,
      },
    });

    expect(globalState).toEqual({});
  });

  test('should not update timefilter if attributes are invalid', async () => {
    const globalState = restoreStateFromSavedSearch({
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
    });

    expect(globalState).toEqual({});
  });
});
