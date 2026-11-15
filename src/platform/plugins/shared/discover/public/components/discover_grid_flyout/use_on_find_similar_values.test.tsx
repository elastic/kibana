/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook } from '@testing-library/react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { REVERSE_CATEGORIZE_FIELD_TRIGGER } from '@kbn/ui-actions-plugin/common/trigger_ids';
import { discoverServiceMock } from '../../__mocks__/services';
import { useOnFindSimilarValues } from './use_on_find_similar_values';

jest.mock('../../hooks/use_discover_services', () => ({
  useDiscoverServices: () => jest.requireActual('../../__mocks__/services').discoverServiceMock,
}));

describe('useOnFindSimilarValues', () => {
  const messageField = new DataViewField({
    name: 'message',
    type: 'string',
    esTypes: ['text'],
    searchable: true,
    aggregatable: false,
  });
  const dataView = {
    fields: { getByName: (name: string) => (name === 'message' ? messageField : undefined) },
  } as unknown as DataView;
  const queryContext = { query: { query: 'test', language: 'kuery' }, filters: [] };
  const onOpenInNewTab = jest.fn();
  const { uiActions } = discoverServiceMock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(uiActions, 'hasAction').mockReturnValue(true);
    jest.spyOn(uiActions, 'executeTriggerActions').mockResolvedValue(undefined);
  });

  it('should execute the reverse categorize trigger with the query context', () => {
    const { result } = renderHook(() =>
      useOnFindSimilarValues({ dataView, queryContext, onOpenInNewTab })
    );

    result.current?.('message', 'connection refused');

    expect(uiActions.executeTriggerActions).toHaveBeenCalledWith(
      REVERSE_CATEGORIZE_FIELD_TRIGGER,
      expect.objectContaining({
        field: messageField,
        dataView,
        fieldValue: 'connection refused',
        query: queryContext.query,
        filters: queryContext.filters,
        openInNewTab: onOpenInNewTab,
      })
    );
  });

  it('should not execute the trigger for an unknown field', () => {
    const { result } = renderHook(() => useOnFindSimilarValues({ dataView, queryContext }));

    result.current?.('unknown', 'value');

    expect(uiActions.executeTriggerActions).not.toHaveBeenCalled();
  });

  it('should be undefined without a query context', () => {
    const { result } = renderHook(() => useOnFindSimilarValues({ dataView }));

    expect(result.current).toBeUndefined();
  });

  it('should be undefined when the action is not registered', () => {
    jest.spyOn(uiActions, 'hasAction').mockReturnValue(false);
    const { result } = renderHook(() => useOnFindSimilarValues({ dataView, queryContext }));

    expect(result.current).toBeUndefined();
  });
});
