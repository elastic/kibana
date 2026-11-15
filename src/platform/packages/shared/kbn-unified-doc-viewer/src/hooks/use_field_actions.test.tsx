/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { DataViewField } from '@kbn/data-views-plugin/common';
import { FieldActionsProvider, useUIFieldActions } from './use_field_actions';
import type { UseFieldActionsDeps } from './use_field_actions';

const createDataView = (isTimeBased = true): DataView => {
  const fields = [
    new DataViewField({
      name: 'message',
      type: 'string',
      esTypes: ['text'],
      searchable: true,
      aggregatable: false,
    }),
    new DataViewField({
      name: 'host',
      type: 'string',
      esTypes: ['keyword'],
      searchable: true,
      aggregatable: false,
    }),
  ];
  return {
    isTimeBased: () => isTimeBased,
    fields: { getByName: (name: string) => fields.find((field) => field.name === name) },
  } as unknown as DataView;
};

const renderActions = ({
  field,
  value,
  deps,
}: {
  field: string;
  value: unknown;
  deps: Partial<UseFieldActionsDeps>;
}) =>
  renderHook(() => useUIFieldActions({ field, value }), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <FieldActionsProvider {...(deps as UseFieldActionsDeps)}>{children}</FieldActionsProvider>
    ),
  }).result.current;

describe('useUIFieldActions find similar values', () => {
  const findAction = (actions: ReturnType<typeof renderActions>) =>
    actions.find(({ id }) => id === 'findSimilarValuesAction');

  it('should add the action for a text field and call the callback with its value', () => {
    const onFindSimilarValues = jest.fn();
    const action = findAction(
      renderActions({
        field: 'message',
        value: ['connection refused', 'other'],
        deps: { dataView: createDataView(), onFindSimilarValues },
      })
    );

    expect(action).toBeDefined();
    action?.onClick();
    expect(onFindSimilarValues).toHaveBeenCalledWith('message', 'connection refused');
  });

  it('should not add the action without a callback', () => {
    expect(
      findAction(
        renderActions({ field: 'message', value: 'test', deps: { dataView: createDataView() } })
      )
    ).toBeUndefined();
  });

  it('should not add the action for a non text field', () => {
    expect(
      findAction(
        renderActions({
          field: 'host',
          value: 'test',
          deps: { dataView: createDataView(), onFindSimilarValues: jest.fn() },
        })
      )
    ).toBeUndefined();
  });

  it('should not add the action for a data view that is not time based', () => {
    expect(
      findAction(
        renderActions({
          field: 'message',
          value: 'test',
          deps: { dataView: createDataView(false), onFindSimilarValues: jest.fn() },
        })
      )
    ).toBeUndefined();
  });

  it('should not add the action when there is no value', () => {
    expect(
      findAction(
        renderActions({
          field: 'message',
          value: undefined,
          deps: { dataView: createDataView(), onFindSimilarValues: jest.fn() },
        })
      )
    ).toBeUndefined();
  });
});
