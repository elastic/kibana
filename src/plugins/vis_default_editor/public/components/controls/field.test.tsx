/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { act } from 'react-dom/test-utils';
import { mount, shallow, ReactWrapper } from 'enzyme';
import { EuiComboBoxProps, EuiComboBox } from '@elastic/eui';

import { IAggConfig, IndexPatternField, AggParam } from '@kbn/data-plugin/public';
import { ComboBoxGroupedOptions } from '../../utils';
import { FieldParamEditor, FieldParamEditorProps } from './field';
import { EditorVisState } from '../sidebar/state/reducers';

function callComboBoxOnChange(comp: ReactWrapper, value: any = []) {
  const comboBoxProps = comp.find(EuiComboBox).props() as EuiComboBoxProps<any>;
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
  let indexedFields: ComboBoxGroupedOptions<IndexPatternField>;
  let field: IndexPatternField;
  let option: {
    label: string;
    target: IndexPatternField;
  };

  beforeEach(() => {
    setValue = jest.fn();
    setValidity = jest.fn();
    setTouched = jest.fn();
    onChange = jest.fn();

    field = { displayName: 'bytes', type: 'bytes' } as IndexPatternField;
    option = { label: 'bytes', target: field };
    indexedFields = [
      {
        label: 'Field',
        options: [option],
      },
    ];

    defaultProps = {
      agg: {
        type: {
          params: [
            {
              name: 'field',
              filterFieldTypes: ['bytes'],
            } as unknown as AggParam,
          ],
        },
      } as IAggConfig,
      aggParam: {
        name: 'field',
        type: 'field',
        editorComponent: () => null,
        onChange,
      } as any,
      formIsTouched: false,
      value: undefined,
      editorConfig: {},
      indexedFields,
      showValidation: false,
      setValue,
      setValidity,
      setTouched,
      state: {} as EditorVisState,
      metricAggs: [] as IAggConfig[],
      schemas: [],
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
