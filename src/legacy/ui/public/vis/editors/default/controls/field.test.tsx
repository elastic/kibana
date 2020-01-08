/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { mount, shallow, ReactWrapper } from 'enzyme';
import { EuiComboBoxProps, EuiComboBox } from '@elastic/eui';
import { Field } from '../../../../../../../plugins/data/public';
import { ComboBoxGroupedOptions, SubAggParamsProp } from '..';
import { FieldParamEditor, FieldParamEditorProps } from './field';
import { AggConfig, VisState } from '../../..';

function callComboBoxOnChange(comp: ReactWrapper, value: any = []) {
  const comboBoxProps: EuiComboBoxProps<string> = comp.find(EuiComboBox).props();
  if (comboBoxProps.onChange) {
    comboBoxProps.onChange(value);
  }
}

describe('FieldParamEditor component', () => {
  let setValue: jest.Mock;
  let setValidity: jest.Mock;
  let setTouched: jest.Mock;
  let onChange: jest.Mock;
  let defaultProps: FieldParamEditorProps;
  let indexedFields: ComboBoxGroupedOptions<Field>;
  let field: Field;
  let option: {
    label: string;
    target: Field;
  };

  beforeEach(() => {
    setValue = jest.fn();
    setValidity = jest.fn();
    setTouched = jest.fn();
    onChange = jest.fn();

    field = { displayName: 'bytes' } as Field;
    option = { label: 'bytes', target: field };
    indexedFields = [
      {
        label: 'Field',
        options: [option],
      },
    ];

    defaultProps = {
      agg: {} as AggConfig,
      aggParam: {
        name: 'field',
        type: 'field',
        editorComponent: () => null,
        onChange,
      } as any,
      value: undefined,
      editorConfig: {},
      indexedFields,
      showValidation: false,
      setValue,
      setValidity,
      setTouched,
      state: {} as VisState,
      metricAggs: [] as AggConfig[],
      subAggParams: {} as SubAggParamsProp,
    };
  });

  it('should disable combo box when indexedFields is empty', () => {
    defaultProps.indexedFields = [];
    const comp = shallow(<FieldParamEditor {...defaultProps} />);

    expect(comp.find('EuiComboBox').prop('isDisabled')).toBeTruthy();
  });

  it('should set field option value if only one available', () => {
    mount(<FieldParamEditor {...defaultProps} />);

    expect(setValue).toHaveBeenCalledWith(field);
  });

  // this is the case when field options do not have groups
  it('should set field value if only one available', () => {
    defaultProps.indexedFields = [option];
    mount(<FieldParamEditor {...defaultProps} />);

    expect(setValue).toHaveBeenCalledWith(field);
  });

  it('should set validity as true when value is defined', () => {
    defaultProps.value = field;
    mount(<FieldParamEditor {...defaultProps} />);

    expect(setValidity).toHaveBeenCalledWith(true);
  });

  it('should set validity as false when value is not defined', () => {
    mount(<FieldParamEditor {...defaultProps} />);

    expect(setValidity).toHaveBeenCalledWith(false);
  });

  it('should set validity as false when there are no indexedFields', () => {
    defaultProps.indexedFields = [];
    mount(<FieldParamEditor {...defaultProps} />);

    expect(setValidity).toHaveBeenCalledWith(false);
  });

  it('should set validity as false when there are a custom error', () => {
    defaultProps.customError = 'customError';
    mount(<FieldParamEditor {...defaultProps} />);

    expect(setValidity).toHaveBeenCalledWith(false);
  });

  it('should call setTouched when the control is invalid', () => {
    defaultProps.value = field;
    const comp = mount(<FieldParamEditor {...defaultProps} />);
    expect(setTouched).not.toHaveBeenCalled();
    comp.setProps({ customError: 'customError' });

    expect(setTouched).toHaveBeenCalled();
  });

  it('should call onChange when a field selected', () => {
    const comp = mount(<FieldParamEditor {...defaultProps} />);
    act(() => {
      // simulate the field selection
      callComboBoxOnChange(comp, [{ target: field }]);
    });

    expect(onChange).toHaveBeenCalled();
  });

  it('should call setValue when nothing selected and field is not required', () => {
    defaultProps.aggParam.required = false;
    defaultProps.indexedFields = [indexedFields[0], indexedFields[0]];
    const comp = mount(<FieldParamEditor {...defaultProps} />);
    expect(setValue).toHaveBeenCalledTimes(0);

    act(() => {
      callComboBoxOnChange(comp);
    });

    expect(setValue).toHaveBeenCalledTimes(1);
    expect(setValue).toHaveBeenCalledWith(undefined);
  });

  it('should not call setValue when nothing selected and field is required', () => {
    defaultProps.aggParam.required = true;
    const comp = mount(<FieldParamEditor {...defaultProps} />);
    expect(setValue).toHaveBeenCalledTimes(1);

    act(() => {
      callComboBoxOnChange(comp);
    });

    expect(setValue).toHaveBeenCalledTimes(1);
  });

  it('should call setValue when a field selected and field is required', () => {
    defaultProps.aggParam.required = true;
    const comp = mount(<FieldParamEditor {...defaultProps} />);
    expect(setValue).toHaveBeenCalledTimes(1);

    act(() => {
      callComboBoxOnChange(comp, [{ target: field }]);
    });

    expect(setValue).toHaveBeenCalledTimes(2);
    expect(setValue).toHaveBeenLastCalledWith(field);
  });
});
