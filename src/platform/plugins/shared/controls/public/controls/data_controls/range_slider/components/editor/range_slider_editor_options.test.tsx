/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RangeSliderControlState } from '@kbn/controls-schemas';
import { fireEvent, render } from '@testing-library/react';
import React from 'react';
import { RangeSliderEditorOptions } from './range_slider_editor_options';

describe('RangeSliderEditorOptions', () => {
  test('defaults to step size of 1', async () => {
    const component = render(
      <RangeSliderEditorOptions
        initialState={{} as RangeSliderControlState}
        updateState={jest.fn()}
        setControlEditorValid={jest.fn()}
      />
    );
    expect(
      component.getByTestId('rangeSliderControl__stepAdditionalSetting').getAttribute('value')
    ).toBe('1');
  });

  test('validates step setting is greater than 0', async () => {
    const setControlEditorValid = jest.fn();
    const component = render(
      <RangeSliderEditorOptions
        initialState={{} as RangeSliderControlState}
        updateState={jest.fn()}
        setControlEditorValid={setControlEditorValid}
      />
    );

    fireEvent.change(component.getByTestId('rangeSliderControl__stepAdditionalSetting'), {
      target: { valueAsNumber: -1 },
    });
    expect(setControlEditorValid).toBeCalledWith(false);
    fireEvent.change(component.getByTestId('rangeSliderControl__stepAdditionalSetting'), {
      target: { value: undefined },
    });
    expect(setControlEditorValid).toBeCalledWith(false);
    fireEvent.change(component.getByTestId('rangeSliderControl__stepAdditionalSetting'), {
      target: { valueAsNumber: 0 },
    });
    expect(setControlEditorValid).toBeCalledWith(false);
    fireEvent.change(component.getByTestId('rangeSliderControl__stepAdditionalSetting'), {
      target: { valueAsNumber: 0.5 },
    });
    expect(setControlEditorValid).toBeCalledWith(true);
    fireEvent.change(component.getByTestId('rangeSliderControl__stepAdditionalSetting'), {
      target: { valueAsNumber: 10 },
    });
    expect(setControlEditorValid).toBeCalledWith(true);
  });
});
