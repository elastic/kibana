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
        selected: option.getAttribute('aria-selected'),
      }))
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "label": "Auto",
          "selected": "true",
          "value": "auto",
        },
        Object {
          "label": "Millisecond",
          "selected": "false",
          "value": "ms",
        },
        Object {
          "label": "Second",
          "selected": "false",
          "value": "s",
        },
        Object {
          "label": "Minute",
          "selected": "false",
          "value": "m",
        },
        Object {
          "label": "Hour",
          "selected": "false",
          "value": "h",
        },
        Object {
          "label": "Day",
          "selected": "false",
          "value": "d",
        },
        Object {
          "label": "Week",
          "selected": "false",
          "value": "w",
        },
        Object {
          "label": "Month",
          "selected": "false",
          "value": "M",
        },
        Object {
          "label": "Year",
          "selected": "false",
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
        selected: option.getAttribute('aria-selected'),
      }))
    ).toMatchInlineSnapshot(`
      Array [
        Object {
          "label": "Auto",
          "selected": "false",
          "value": "auto",
        },
        Object {
          "label": "Millisecond",
          "selected": "false",
          "value": "ms",
        },
        Object {
          "label": "Second",
          "selected": "false",
          "value": "s",
        },
        Object {
          "label": "Minute",
          "selected": "false",
          "value": "m",
        },
        Object {
          "label": "Hour",
          "selected": "false",
          "value": "h",
        },
        Object {
          "label": "Day",
          "selected": "false",
          "value": "d",
        },
        Object {
          "label": "Week",
          "selected": "false",
          "value": "w",
        },
        Object {
          "label": "Month",
          "selected": "false",
          "value": "M",
        },
        Object {
          "label": "Year",
          "selected": "true",
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
