/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, act, screen } from '@testing-library/react';
import React from 'react';
import { UnifiedHistogramBreakdownContext } from '../types';
import { dataViewWithTimefieldMock } from '../__mocks__/data_view_with_timefield';
import { BreakdownFieldSelector } from './breakdown_field_selector';

describe('BreakdownFieldSelector', () => {
  it('should render correctly', () => {
    const onBreakdownFieldChange = jest.fn();
    const breakdown: UnifiedHistogramBreakdownContext = {
      field: undefined,
    };

    render(
      <BreakdownFieldSelector
        dataView={dataViewWithTimefieldMock}
        breakdown={breakdown}
        onBreakdownFieldChange={onBreakdownFieldChange}
      />
    );

    const button = screen.getByTestId('unifiedHistogramBreakdownSelectorButton');
    expect(button.getAttribute('data-selected-value')).toBe(null);

    act(() => {
      button.click();
    });

    const options = screen.getAllByRole('option');
    expect(
      options.map((option) => ({
        label: option.getAttribute('title'),
        value: option.getAttribute('value'),
        checked: option.getAttribute('aria-checked'),
      }))
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "checked": "true",
          "label": "No breakdown",
          "value": "__EMPTY_SELECTOR_OPTION__",
        },
        Object {
          "checked": "false",
          "label": "bytes",
          "value": "bytes",
        },
        Object {
          "checked": "false",
          "label": "extension",
          "value": "extension",
        },
      ]
    `);
  });

  it('should mark the option as checked if breakdown.field is defined', () => {
    const onBreakdownFieldChange = jest.fn();
    const field = dataViewWithTimefieldMock.fields.find((f) => f.name === 'extension')!;
    const breakdown: UnifiedHistogramBreakdownContext = { field };

    render(
      <BreakdownFieldSelector
        dataView={dataViewWithTimefieldMock}
        breakdown={breakdown}
        onBreakdownFieldChange={onBreakdownFieldChange}
      />
    );

    const button = screen.getByTestId('unifiedHistogramBreakdownSelectorButton');
    expect(button.getAttribute('data-selected-value')).toBe('extension');

    act(() => {
      button.click();
    });

    const options = screen.getAllByRole('option');
    expect(
      options.map((option) => ({
        label: option.getAttribute('title'),
        value: option.getAttribute('value'),
        checked: option.getAttribute('aria-checked'),
      }))
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "checked": "false",
          "label": "No breakdown",
          "value": "__EMPTY_SELECTOR_OPTION__",
        },
        Object {
          "checked": "false",
          "label": "bytes",
          "value": "bytes",
        },
        Object {
          "checked": "true",
          "label": "extension",
          "value": "extension",
        },
      ]
    `);
  });

  it('should call onBreakdownFieldChange with the selected field when the user selects a field', () => {
    const onBreakdownFieldChange = jest.fn();
    const selectedField = dataViewWithTimefieldMock.fields.find((f) => f.name === 'bytes')!;
    const breakdown: UnifiedHistogramBreakdownContext = {
      field: undefined,
    };
    render(
      <BreakdownFieldSelector
        dataView={dataViewWithTimefieldMock}
        breakdown={breakdown}
        onBreakdownFieldChange={onBreakdownFieldChange}
      />
    );

    act(() => {
      screen.getByTestId('unifiedHistogramBreakdownSelectorButton').click();
    });

    act(() => {
      screen.getByTitle('bytes').click();
    });

    expect(onBreakdownFieldChange).toHaveBeenCalledWith(selectedField);
  });
});
