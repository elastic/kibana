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
