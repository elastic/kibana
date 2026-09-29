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
import { mount, shallow } from 'enzyme';
import { act } from 'react-dom/test-utils';
import type { IAggConfigs, IAggConfig } from '@kbn/data-plugin/public';
import type { ISchemas } from '@kbn/visualizations-plugin/public';
import { createMockedVisEditorSchemas } from '@kbn/visualizations-plugin/public/mocks';

import type { DefaultEditorAggGroupProps } from './agg_group';
import { DefaultEditorAggGroup } from './agg_group';
import { DefaultEditorAgg } from './agg';
import { DefaultEditorAggAdd } from './agg_add';
import type { EditorVisState } from './sidebar/state/reducers';
import { EuiThemeProvider } from '@elastic/eui';

vi.mock('@elastic/eui', async () => {
  const original = await vi.importActual('@elastic/eui');

  return {
    ...original,
    EuiTitle: 'eui-title',
    EuiDragDropContext: 'eui-drag-drop-context',
    EuiDroppable: 'eui-droppable',
    EuiDraggable: (props: any) => props.children({ dragHandleProps: {} }),
    EuiSpacer: 'eui-spacer',
    EuiPanel: 'eui-panel',
  };
});

vi.mock('./agg', () => {
  const mocked = {
    DefaultEditorAgg: () => <div />,
  };
  return { ...mocked, default: mocked };
});

vi.mock('./agg_add', () => {
  const mocked = {
    DefaultEditorAggAdd: () => <div />,
  };
  return { ...mocked, default: mocked };
});

describe('DefaultEditorAgg component', () => {
  let defaultProps: DefaultEditorAggGroupProps;
  let aggs: IAggConfigs;
  let schemas: ISchemas;
  let setTouched: Mock;
  let setValidity: Mock;
  let reorderAggs: Mock;

  beforeEach(() => {
    setTouched = vi.fn();
    setValidity = vi.fn();
    reorderAggs = vi.fn();
    schemas = createMockedVisEditorSchemas([
      {
        name: 'metrics',
        group: 'metrics',
        max: 1,
      },
      {
        name: 'buckets',
        group: 'buckets',
        max: 1,
      },
    ]);

    aggs = {
      aggs: [
        {
          id: '1',
          params: {
            field: {
              type: 'number',
            },
          },
          schema: 'metrics',
        } as IAggConfig,
        {
          id: '3',
          params: {
            field: {
              type: 'string',
            },
          },
          schema: 'metrics',
        } as IAggConfig,
        {
          id: '2',
          params: {
            field: {
              type: 'number',
            },
          },
          schema: 'buckets',
        } as IAggConfig,
      ],
    } as IAggConfigs;

    defaultProps = {
      formIsTouched: false,
      metricAggs: [],
      groupName: 'metrics',
      state: {
        data: { aggs },
      } as EditorVisState,
      schemas: schemas.metrics,
      setTouched,
      setValidity,
      reorderAggs,
      addSchema: () => {},
      removeAgg: () => {},
      setAggParamValue: vi.fn(),
      setStateParamValue: vi.fn(),
      onAggTypeChange: vi.fn(),
      onToggleEnableAgg: () => {},
    };
  });

  it('should init with the default set of props', () => {
    const comp = shallow(<DefaultEditorAggGroup {...defaultProps} />);

    expect(comp).toMatchSnapshot();
  });

  it('should call setTouched with false', () => {
    mount(
      <EuiThemeProvider>
        <DefaultEditorAggGroup {...defaultProps} />
      </EuiThemeProvider>
    );

    expect(setTouched).toHaveBeenCalledWith(false);
  });

  it('should last bucket has truthy isLastBucket prop', () => {
    defaultProps.groupName = 'buckets';
    defaultProps.schemas = schemas.buckets;
    const comp = mount(
      <EuiThemeProvider>
        <DefaultEditorAggGroup {...defaultProps} />
      </EuiThemeProvider>
    );
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
      defaultProps.state.data.aggs!.aggs[0],
      defaultProps.state.data.aggs!.aggs[1]
    );
  });

  it('should show add button when schemas count is less than max', () => {
    defaultProps.groupName = 'buckets';
    defaultProps.schemas = schemas.buckets;
    defaultProps.schemas[0].max = 2;
    const comp = shallow(<DefaultEditorAggGroup {...defaultProps} />);

    expect(comp.find(DefaultEditorAggAdd).exists()).toBeTruthy();
  });

  it('should not show add button when schemas count is not less than max', () => {
    const comp = shallow(<DefaultEditorAggGroup {...defaultProps} />);

    expect(comp.find(DefaultEditorAggAdd).exists()).toBeFalsy();
  });
});
