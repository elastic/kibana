/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import React from 'react';
import { mount } from 'enzyme';

import type { IAggConfig } from '@kbn/data-plugin/public';
import { AggGroupNames } from '@kbn/data-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import type { DefaultEditorAggParamsProps } from './agg_params';
import { DefaultEditorAggParams as PureDefaultEditorAggParams } from './agg_params';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import type { EditorVisState } from './sidebar/state/reducers';

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

vi.mock('./utils', () => {
  const mocked = {
    getEditorConfig: vi.fn(() => mockEditorConfig),
  };
  return { ...mocked, default: mocked };
});
vi.mock('./agg_params_helper', () => {
  const mocked = {
    getAggParamsToRender: vi.fn(() => ({
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
    getAggTypeOptions: vi.fn(() => []),
    getError: vi.fn((agg, aggIsTooLow) => (aggIsTooLow ? ['error'] : [])),
    isInvalidParamsTouched: vi.fn(() => false),
  };
  return { ...mocked, default: mocked };
});
vi.mock('./agg_select', () => {
  const mocked = {
    DefaultEditorAggSelect: () => null,
  };
  return { ...mocked, default: mocked };
});
vi.mock('./agg_param', () => {
  const mocked = {
    DefaultEditorAggParam: () => null,
  };
  return { ...mocked, default: mocked };
});

describe('DefaultEditorAggParams component', () => {
  let setAggParamValue: Mock;
  let onAggTypeChange: Mock;
  let setTouched: Mock;
  let setValidity: Mock;
  let intervalDeserialize: Mock;
  let defaultProps: DefaultEditorAggParamsProps;

  beforeEach(() => {
    setAggParamValue = vi.fn();
    onAggTypeChange = vi.fn();
    setTouched = vi.fn();
    setValidity = vi.fn();
    intervalDeserialize = vi.fn(() => 'deserialized');

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
      indexPattern: {} as DataView,
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

    expect(setValidity).toHaveBeenLastCalledWith(false);

    comp.unmount();

    expect(setValidity).toHaveBeenLastCalledWith(true);
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

    expect(setTouched).toHaveBeenLastCalledWith(false);
  });

  it('should set the validity when it changed', () => {
    const comp = mount(<DefaultEditorAggParams {...defaultProps} />);

    comp.setProps({ aggIsTooLow: true });

    expect(setValidity).toHaveBeenLastCalledWith(false);

    comp.setProps({ aggIsTooLow: false });

    expect(setValidity).toHaveBeenLastCalledWith(true);
  });

  it('should call setTouched when all invalid controls were touched or they are untouched', () => {
    const comp = mount(<DefaultEditorAggParams {...defaultProps} />);

    comp.setProps({ aggIsTooLow: true });

    expect(setTouched).toHaveBeenLastCalledWith(true);

    comp.setProps({ aggIsTooLow: false });

    expect(setTouched).toHaveBeenLastCalledWith(false);
  });
});
