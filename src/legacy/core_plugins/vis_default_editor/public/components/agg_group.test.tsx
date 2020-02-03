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
import { mount, shallow } from 'enzyme';
import { act } from 'react-dom/test-utils';
import { VisState } from 'src/legacy/core_plugins/visualizations/public';
import { AggConfigs, AggConfig, Schema } from '../legacy_imports';
import { DefaultEditorAggGroup, DefaultEditorAggGroupProps } from './agg_group';
import { DefaultEditorAgg } from './agg';
import { DefaultEditorAggAdd } from './agg_add';

jest.mock('@elastic/eui', () => ({
  EuiTitle: 'eui-title',
  EuiDragDropContext: 'eui-drag-drop-context',
  EuiDroppable: 'eui-droppable',
  EuiDraggable: (props: any) => props.children({ dragHandleProps: {} }),
  EuiSpacer: 'eui-spacer',
  EuiPanel: 'eui-panel',
}));

jest.mock('../legacy_imports', () => ({
  aggGroupNamesMap: () => ({
    metrics: 'Metrics',
    buckets: 'Buckets',
  }),
  AggGroupNames: {
    Metrics: 'metrics',
    Buckets: 'buckets',
  },
}));

jest.mock('./agg', () => ({
  DefaultEditorAgg: () => <div />,
}));

jest.mock('./agg_add', () => ({
  DefaultEditorAggAdd: () => <div />,
}));

describe('DefaultEditorAgg component', () => {
  let defaultProps: DefaultEditorAggGroupProps;
  let aggs: AggConfigs;
  let setTouched: jest.Mock;
  let setValidity: jest.Mock;
  let reorderAggs: jest.Mock;

  beforeEach(() => {
    setTouched = jest.fn();
    setValidity = jest.fn();
    reorderAggs = jest.fn();

    aggs = {
      aggs: [
        {
          id: '1',
          params: {
            field: {
              type: 'number',
            },
          },
          schema: { group: 'metrics' },
        } as AggConfig,
        {
          id: '3',
          params: {
            field: {
              type: 'string',
            },
          },
          schema: { group: 'metrics' },
        } as AggConfig,
        {
          id: '2',
          params: {
            field: {
              type: 'number',
            },
          },
          schema: { group: 'buckets' },
        } as AggConfig,
      ],
    } as AggConfigs;

    defaultProps = {
      formIsTouched: false,
      metricAggs: [],
      groupName: 'metrics',
      state: {
        aggs,
      } as VisState,
      schemas: [
        {
          max: 1,
        } as Schema,
        {
          max: 1,
        } as Schema,
      ],
      setTouched,
      setValidity,
      reorderAggs,
      addSchema: () => {},
      removeAgg: () => {},
      setAggParamValue: jest.fn(),
      setStateParamValue: jest.fn(),
      onAggTypeChange: jest.fn(),
      onToggleEnableAgg: () => {},
    };
  });

  it('should init with the default set of props', () => {
    const comp = shallow(<DefaultEditorAggGroup {...defaultProps} />);

    expect(comp).toMatchSnapshot();
  });

  it('should call setTouched with false', () => {
    mount(<DefaultEditorAggGroup {...defaultProps} />);

    expect(setTouched).toBeCalledWith(false);
  });

  it('should last bucket has truthy isLastBucket prop', () => {
    defaultProps.groupName = 'buckets';
    const comp = mount(<DefaultEditorAggGroup {...defaultProps} />);
    const lastAgg = comp.find(DefaultEditorAgg).last();

    expect(lastAgg.props()).toHaveProperty('isLastBucket', true);
  });

  it('should call reorderAggs when dragging ended', () => {
    const comp = shallow(<DefaultEditorAggGroup {...defaultProps} />);
    act(() => {
      // simulate dragging ending
      comp.props().onDragEnd({ source: { index: 0 }, destination: { index: 1 } });
    });

    expect(reorderAggs).toHaveBeenCalledWith(
      defaultProps.state.aggs.aggs[0],
      defaultProps.state.aggs.aggs[1]
    );
  });

  it('should show add button when schemas count is less than max', () => {
    defaultProps.groupName = 'buckets';
    const comp = shallow(<DefaultEditorAggGroup {...defaultProps} />);

    expect(comp.find(DefaultEditorAggAdd).exists()).toBeTruthy();
  });

  it('should not show add button when schemas count is not less than max', () => {
    const comp = shallow(<DefaultEditorAggGroup {...defaultProps} />);

    expect(comp.find(DefaultEditorAggAdd).exists()).toBeFalsy();
  });
});
