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
import { mount } from 'enzyme';
import { OrderByParamEditor } from './order_by';

describe('OrderAggParamEditor component', () => {
  let setValue: jest.Mock;
  let setValidity: jest.Mock;
  let setTouched: jest.Mock;
  let defaultProps: any;

  beforeEach(() => {
    setValue = jest.fn();
    setValidity = jest.fn();
    setTouched = jest.fn();

    defaultProps = {
      agg: {},
      aggParam: {
        name: 'orderAgg',
        type: '',
      },
      editorConfig: {},
      value: '',
      showValidation: false,
      setValue,
      setValidity,
      setTouched,
    };
  });

  it('defaults to the first metric agg after init', () => {
    const metricAggs = [
      {
        id: 'agg1',
        type: {
          name: 'count',
        },
      },
      {
        id: 'agg2',
        type: {
          name: 'count',
        },
      },
    ];
    const props = { ...defaultProps, metricAggs };

    mount(<OrderByParamEditor {...props} />);

    expect(setValue).toHaveBeenCalledWith('agg1');
  });

  it('defaults to the first metric agg that is compatible with the terms bucket', () => {
    const metricAggs = [
      {
        id: 'agg1',
        type: {
          name: 'top_hits',
        },
      },
      {
        id: 'agg2',
        type: {
          name: 'percentiles',
        },
      },
      {
        id: 'agg3',
        type: {
          name: 'median',
        },
      },
      {
        id: 'agg4',
        type: {
          name: 'std_dev',
        },
      },
      {
        id: 'agg5',
        type: {
          name: 'count',
        },
      },
    ];
    const props = { ...defaultProps, metricAggs };

    mount(<OrderByParamEditor {...props} />);

    expect(setValue).toHaveBeenCalledWith('agg5');
  });

  it('defaults to the _key metric if no agg is compatible', () => {
    const metricAggs = [
      {
        id: 'agg1',
        type: {
          name: 'top_hits',
        },
      },
    ];
    const props = { ...defaultProps, metricAggs };

    mount(<OrderByParamEditor {...props} />);

    expect(setValue).toHaveBeenCalledWith('_key');
  });

  it('selects first metric if it is avg', () => {
    const metricAggs = [
      {
        id: 'agg1',
        type: {
          name: 'avg',
          field: 'bytes',
        },
      },
    ];
    const props = { ...defaultProps, metricAggs };

    mount(<OrderByParamEditor {...props} />);

    expect(setValue).toHaveBeenCalledWith('agg1');
  });

  it('selects _key if the first metric is avg_bucket', () => {
    const metricAggs = [
      {
        id: 'agg1',
        type: {
          name: 'avg_bucket',
          metric: 'custom',
        },
      },
    ];
    const props = { ...defaultProps, metricAggs };

    mount(<OrderByParamEditor {...props} />);

    expect(setValue).toHaveBeenCalledWith('_key');
  });

  it('selects _key if there are no metric aggs', () => {
    mount(<OrderByParamEditor {...defaultProps} />);

    expect(setValue).toHaveBeenCalledWith('_key');
  });
});
