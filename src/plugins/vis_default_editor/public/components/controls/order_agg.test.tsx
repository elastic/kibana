/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
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

    expect(setValue).toHaveBeenCalledWith('agg3');
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
