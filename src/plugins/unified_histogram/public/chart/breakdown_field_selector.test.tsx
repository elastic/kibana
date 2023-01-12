/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiComboBox } from '@elastic/eui';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';
import { UnifiedHistogramBreakdownContext } from '..';
import { dataViewWithTimefieldMock } from '../__mocks__/data_view_with_timefield';
import { BreakdownFieldSelector } from './breakdown_field_selector';
import { fieldSupportsBreakdown } from './field_supports_breakdown';

describe('BreakdownFieldSelector', () => {
  it('should pass fields that support breakdown as options to the EuiComboBox', () => {
    const onBreakdownFieldChange = jest.fn();
    const breakdown: UnifiedHistogramBreakdownContext = {
      field: undefined,
    };
    const wrapper = mountWithIntl(
      <BreakdownFieldSelector
        dataView={dataViewWithTimefieldMock}
        breakdown={breakdown}
        onBreakdownFieldChange={onBreakdownFieldChange}
      />
    );
    const comboBox = wrapper.find(EuiComboBox);
    expect(comboBox.prop('options')).toEqual(
      dataViewWithTimefieldMock.fields
        .filter(fieldSupportsBreakdown)
        .map((field) => ({ label: field.displayName, value: field.name }))
        .sort((a, b) => a.label.toLowerCase().localeCompare(b.label.toLowerCase()))
    );
  });

  it('should pass selectedOptions to the EuiComboBox if breakdown.field is defined', () => {
    const onBreakdownFieldChange = jest.fn();
    const field = dataViewWithTimefieldMock.fields.find((f) => f.name === 'extension')!;
    const breakdown: UnifiedHistogramBreakdownContext = { field };
    const wrapper = mountWithIntl(
      <BreakdownFieldSelector
        dataView={dataViewWithTimefieldMock}
        breakdown={breakdown}
        onBreakdownFieldChange={onBreakdownFieldChange}
      />
    );
    const comboBox = wrapper.find(EuiComboBox);
    expect(comboBox.prop('selectedOptions')).toEqual([
      { label: field.displayName, value: field.name },
    ]);
  });

  it('should call onBreakdownFieldChange with the selected field when the user selects a field', () => {
    const onBreakdownFieldChange = jest.fn();
    const breakdown: UnifiedHistogramBreakdownContext = {
      field: undefined,
    };
    const wrapper = mountWithIntl(
      <BreakdownFieldSelector
        dataView={dataViewWithTimefieldMock}
        breakdown={breakdown}
        onBreakdownFieldChange={onBreakdownFieldChange}
      />
    );
    const comboBox = wrapper.find(EuiComboBox);
    const selectedField = dataViewWithTimefieldMock.fields.find((f) => f.name === 'extension')!;
    comboBox.prop('onChange')!([{ label: selectedField.displayName, value: selectedField.name }]);
    expect(onBreakdownFieldChange).toHaveBeenCalledWith(selectedField);
  });
});
