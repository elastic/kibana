/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { AggParamEditorProps } from '../agg_param_props';
import { IAggConfig } from 'src/plugins/data/public';
import { mount } from 'enzyme';
import { PercentilesEditor } from './percentiles';
import { EditorVisState } from '../sidebar/state/reducers';

describe('PercentilesEditor component', () => {
  let setValue: jest.Mock;
  let setValidity: jest.Mock;
  let setTouched: jest.Mock;
  let defaultProps: AggParamEditorProps<Array<number | undefined>>;

  beforeEach(() => {
    setValue = jest.fn();
    setValidity = jest.fn();
    setTouched = jest.fn();

    defaultProps = {
      agg: {} as IAggConfig,
      aggParam: {} as any,
      formIsTouched: false,
      value: [1, 5, 25, 50, 75, 95, 99],
      editorConfig: {},
      showValidation: false,
      setValue,
      setValidity,
      setTouched,
      state: {} as EditorVisState,
      metricAggs: [] as IAggConfig[],
      schemas: [],
    };
  });

  it('should set valid state to true after adding a unique percentile', () => {
    defaultProps.value = [1, 5, 25, 50, 70];
    mount(<PercentilesEditor {...defaultProps} />);
    expect(setValidity).lastCalledWith(true);
  });

  it('should set valid state to false after adding a duplicate percentile', () => {
    defaultProps.value = [1, 5, 25, 50, 50];
    mount(<PercentilesEditor {...defaultProps} />);
    expect(setValidity).lastCalledWith(false);
  });
});
