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
import { TimeIntervalSelector } from './time_interval_selector';

describe('TimeIntervalSelector', () => {
  it('should render correctly', () => {
    const onTimeIntervalChange = jest.fn();

    render(
      <TimeIntervalSelector
        chart={{
          timeInterval: 'auto',
        }}
        onTimeIntervalChange={onTimeIntervalChange}
      />
    );

    const button = screen.getByTestId('unifiedHistogramTimeIntervalSelectorButton');
    expect(button.getAttribute('data-selected-value')).toBe('auto');

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
          "label": "Auto",
          "value": "auto",
        },
        Object {
          "checked": "false",
          "label": "Millisecond",
          "value": "ms",
        },
        Object {
          "checked": "false",
          "label": "Second",
          "value": "s",
        },
        Object {
          "checked": "false",
          "label": "Minute",
          "value": "m",
        },
        Object {
          "checked": "false",
          "label": "Hour",
          "value": "h",
        },
        Object {
          "checked": "false",
          "label": "Day",
          "value": "d",
        },
        Object {
          "checked": "false",
          "label": "Week",
          "value": "w",
        },
        Object {
          "checked": "false",
          "label": "Month",
          "value": "M",
        },
        Object {
          "checked": "false",
          "label": "Year",
          "value": "y",
        },
      ]
    `);
  });

  it('should mark the selected option as checked', () => {
    const onTimeIntervalChange = jest.fn();

    render(
      <TimeIntervalSelector
        chart={{
          timeInterval: 'y',
        }}
        onTimeIntervalChange={onTimeIntervalChange}
      />
    );

    const button = screen.getByTestId('unifiedHistogramTimeIntervalSelectorButton');
    expect(button.getAttribute('data-selected-value')).toBe('y');

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
          "label": "Auto",
          "value": "auto",
        },
        Object {
          "checked": "false",
          "label": "Millisecond",
          "value": "ms",
        },
        Object {
          "checked": "false",
          "label": "Second",
          "value": "s",
        },
        Object {
          "checked": "false",
          "label": "Minute",
          "value": "m",
        },
        Object {
          "checked": "false",
          "label": "Hour",
          "value": "h",
        },
        Object {
          "checked": "false",
          "label": "Day",
          "value": "d",
        },
        Object {
          "checked": "false",
          "label": "Week",
          "value": "w",
        },
        Object {
          "checked": "false",
          "label": "Month",
          "value": "M",
        },
        Object {
          "checked": "true",
          "label": "Year",
          "value": "y",
        },
      ]
    `);
  });

  it('should call onTimeIntervalChange with the selected option when the user selects an interval', () => {
    const onTimeIntervalChange = jest.fn();

    render(
      <TimeIntervalSelector
        chart={{
          timeInterval: 'auto',
        }}
        onTimeIntervalChange={onTimeIntervalChange}
      />
    );

    act(() => {
      screen.getByTestId('unifiedHistogramTimeIntervalSelectorButton').click();
    });

    act(() => {
      screen.getByTitle('Week').click();
    });

    expect(onTimeIntervalChange).toHaveBeenCalledWith('w');
  });
});
