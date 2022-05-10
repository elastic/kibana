/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mount } from 'enzyme';

import { IndexPattern, IAggConfig, AggGroupNames } from '@kbn/data-plugin/public';
import {
  DefaultEditorAggParams as PureDefaultEditorAggParams,
  DefaultEditorAggParamsProps,
} from './agg_params';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { EditorVisState } from './sidebar/state/reducers';

const mockEditorConfig = {
  useNormalizedEsInterval: { hidden: false, fixedValue: false },
  interval: {
    hidden: false,
    help: 'Must be a multiple of rollup configuration interval: 1m',
    default: '1m',
    timeBase: '1m',
  },
};
const DefaultEditorAggParams = (props: DefaultEditorAggParamsProps) => (
  <KibanaContextProvider services={{ data: dataPluginMock.createStartContract() }}>
    <PureDefaultEditorAggParams {...props} />
  </KibanaContextProvider>
);

jest.mock('./utils', () => ({
  getEditorConfig: jest.fn(() => mockEditorConfig),
}));
jest.mock('./agg_params_helper', () => ({
  getAggParamsToRender: jest.fn(() => ({
    basic: [
      {
        aggParam: {
          displayName: 'Custom label',
          name: 'customLabel',
          type: 'string',
        },
      },
    ],
    advanced: [
      {
        aggParam: {
          advanced: true,
          name: 'json',
          type: 'json',
        },
      },
    ],
  })),
  getAggTypeOptions: jest.fn(() => []),
  getError: jest.fn((agg, aggIsTooLow) => (aggIsTooLow ? ['error'] : [])),
  isInvalidParamsTouched: jest.fn(() => false),
}));
jest.mock('./agg_select', () => ({
  DefaultEditorAggSelect: () => null,
}));
jest.mock('./agg_param', () => ({
  DefaultEditorAggParam: () => null,
}));

describe('DefaultEditorAggParams component', () => {
  let setAggParamValue: jest.Mock;
  let onAggTypeChange: jest.Mock;
  let setTouched: jest.Mock;
  let setValidity: jest.Mock;
  let intervalDeserialize: jest.Mock;
  let defaultProps: DefaultEditorAggParamsProps;

  beforeEach(() => {
    setAggParamValue = jest.fn();
    onAggTypeChange = jest.fn();
    setTouched = jest.fn();
    setValidity = jest.fn();
    intervalDeserialize = jest.fn(() => 'deserialized');

    defaultProps = {
      agg: {
        type: {
          params: [{ name: 'interval', deserialize: intervalDeserialize }],
        },
        params: {},
        schema: {
          title: '',
        },
      } as any as IAggConfig,
      groupName: AggGroupNames.Metrics,
      formIsTouched: false,
      indexPattern: {} as IndexPattern,
      metricAggs: [],
      state: {} as EditorVisState,
      setAggParamValue,
      onAggTypeChange,
      setTouched,
      setValidity,
      schemas: [],
    };
  });

  it('should reset the validity to true when destroyed', () => {
    const comp = mount(<DefaultEditorAggParams {...defaultProps} aggIsTooLow={true} />);

    expect(setValidity).lastCalledWith(false);

    comp.unmount();

    expect(setValidity).lastCalledWith(true);
  });

  it('should set fixed and default values when editorConfig is defined (works in rollup index)', () => {
    mount(<DefaultEditorAggParams {...defaultProps} />);

    expect(setAggParamValue).toHaveBeenNthCalledWith(
      1,
      defaultProps.agg.id,
      'useNormalizedEsInterval',
      false
    );
    expect(intervalDeserialize).toHaveBeenCalledWith('1m');
    expect(setAggParamValue).toHaveBeenNthCalledWith(
      2,
      defaultProps.agg.id,
      'interval',
      'deserialized'
    );
  });

  it('should call setTouched with false when agg type is changed', () => {
    const comp = mount(<DefaultEditorAggParams {...defaultProps} />);

    comp.setProps({ agg: { type: { params: [] } } });

    expect(setTouched).lastCalledWith(false);
  });

  it('should set the validity when it changed', () => {
    const comp = mount(<DefaultEditorAggParams {...defaultProps} />);

    comp.setProps({ aggIsTooLow: true });

    expect(setValidity).lastCalledWith(false);

    comp.setProps({ aggIsTooLow: false });

    expect(setValidity).lastCalledWith(true);
  });

  it('should call setTouched when all invalid controls were touched or they are untouched', () => {
    const comp = mount(<DefaultEditorAggParams {...defaultProps} />);

    comp.setProps({ aggIsTooLow: true });

    expect(setTouched).lastCalledWith(true);

    comp.setProps({ aggIsTooLow: false });

    expect(setTouched).lastCalledWith(false);
  });
});
