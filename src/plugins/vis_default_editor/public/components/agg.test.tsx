/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mount, shallow } from 'enzyme';
import { act } from 'react-dom/test-utils';

import { IndexPattern, IAggType, AggGroupNames } from 'src/plugins/data/public';
import type { Schema } from '../../../visualizations/public';

import { DefaultEditorAgg, DefaultEditorAggProps } from './agg';
import { DefaultEditorAggParams } from './agg_params';
import { AGGS_ACTION_KEYS } from './agg_group_state';
import { EditorVisState } from './sidebar/state/reducers';

jest.mock('./agg_params', () => ({
  DefaultEditorAggParams: () => null,
}));

describe('DefaultEditorAgg component', () => {
  let defaultProps: DefaultEditorAggProps;
  let setAggParamValue: jest.Mock;
  let setStateParamValue: jest.Mock;
  let onToggleEnableAgg: jest.Mock;
  let removeAgg: jest.Mock;
  let setAggsState: jest.Mock;

  beforeEach(() => {
    setAggParamValue = jest.fn();
    setStateParamValue = jest.fn();
    onToggleEnableAgg = jest.fn();
    removeAgg = jest.fn();
    setAggsState = jest.fn();

    defaultProps = {
      agg: {
        id: '1',
        brandNew: true,
        getIndexPattern: () => ({} as IndexPattern),
        schema: 'metric',
        title: 'Metrics',
        params: {},
      } as any,
      aggIndex: 0,
      aggIsTooLow: false,
      dragHandleProps: null,
      formIsTouched: false,
      groupName: AggGroupNames.Metrics,
      isDisabled: false,
      isDraggable: false,
      isLastBucket: false,
      isRemovable: false,
      metricAggs: [],
      state: { params: {} } as EditorVisState,
      setAggParamValue,
      setStateParamValue,
      onAggTypeChange: () => {},
      setAggsState,
      onToggleEnableAgg,
      removeAgg,
      schemas: [
        {
          name: 'metric',
        } as Schema,
      ],
    };
  });

  it('should init with the default set of props', () => {
    const comp = shallow(<DefaultEditorAgg {...defaultProps} />);

    expect(comp).toMatchSnapshot();
  });

  it('should open accordion initially', () => {
    const comp = shallow(<DefaultEditorAgg {...defaultProps} />);

    expect(comp.props()).toHaveProperty('initialIsOpen', true);
  });

  it('should not show description when agg is invalid', () => {
    (defaultProps.agg as any).brandNew = false;
    const comp = mount(<DefaultEditorAgg {...defaultProps} />);

    act(() => {
      comp.find(DefaultEditorAggParams).props().setValidity(false);
    });
    comp.update();
    expect(setAggsState).toBeCalledWith({
      type: AGGS_ACTION_KEYS.VALID,
      payload: false,
      aggId: defaultProps.agg.id,
    });

    expect(
      comp.find('.visEditorSidebar__aggGroupAccordionButtonContent span').exists()
    ).toBeFalsy();
  });

  it('should show description when agg is valid', () => {
    (defaultProps.agg as any).brandNew = false;
    defaultProps.agg.type = {
      makeLabel: () => 'Agg description',
    } as IAggType;
    const comp = mount(<DefaultEditorAgg {...defaultProps} />);

    act(() => {
      comp.find(DefaultEditorAggParams).props().setValidity(true);
    });
    comp.update();
    expect(setAggsState).toBeCalledWith({
      type: AGGS_ACTION_KEYS.VALID,
      payload: true,
      aggId: defaultProps.agg.id,
    });

    expect(comp.find('.visEditorSidebar__aggGroupAccordionButtonContent span').text()).toBe(
      'Agg description'
    );
  });

  it('should call setTouched when accordion is collapsed', () => {
    const comp = mount(<DefaultEditorAgg {...defaultProps} />);
    expect(defaultProps.setAggsState).toBeCalledTimes(0);

    comp.find('.euiAccordion__button').simulate('click');
    // make sure that the accordion is collapsed
    expect(comp.find('.euiAccordion-isOpen').exists()).toBeFalsy();

    expect(defaultProps.setAggsState).toBeCalledWith({
      type: AGGS_ACTION_KEYS.TOUCHED,
      payload: true,
      aggId: defaultProps.agg.id,
    });
  });

  it('should call setAggsState inside setValidity', () => {
    const comp = mount(<DefaultEditorAgg {...defaultProps} />);

    act(() => {
      comp.find(DefaultEditorAggParams).props().setValidity(false);
    });

    expect(setAggsState).toBeCalledWith({
      type: AGGS_ACTION_KEYS.VALID,
      payload: false,
      aggId: defaultProps.agg.id,
    });

    expect(
      comp.find('.visEditorSidebar__aggGroupAccordionButtonContent span').exists()
    ).toBeFalsy();
  });

  it('should add schema component', () => {
    defaultProps.agg.schema = 'split';
    const comp = mount(<DefaultEditorAgg {...defaultProps} />);

    expect(comp.find('RowsOrColumnsControl').exists()).toBeTruthy();
  });

  describe('agg actions', () => {
    beforeEach(() => {
      defaultProps.agg.enabled = true;
    });

    it('should not have actions', () => {
      const comp = shallow(<DefaultEditorAgg {...defaultProps} />);
      const actions = comp.prop('extraAction');

      expect(actions).toBeNull();
    });

    it('should have disable and remove actions', () => {
      defaultProps.isRemovable = true;
      const comp = mount(<DefaultEditorAgg {...defaultProps} />);

      expect(
        comp.find('[data-test-subj="toggleDisableAggregationBtn disable"] button').exists()
      ).toBeTruthy();
      expect(comp.find('[data-test-subj="removeDimensionBtn"] button').exists()).toBeTruthy();
    });

    it('should have draggable action', () => {
      defaultProps.isDraggable = true;
      const comp = mount(<DefaultEditorAgg {...defaultProps} />);

      expect(comp.find('[data-test-subj="dragHandleBtn"]').exists()).toBeTruthy();
    });

    it('should disable agg', () => {
      defaultProps.isRemovable = true;
      const comp = mount(<DefaultEditorAgg {...defaultProps} />);
      comp.find('[data-test-subj="toggleDisableAggregationBtn disable"] button').simulate('click');

      expect(defaultProps.onToggleEnableAgg).toBeCalledWith(defaultProps.agg.id, false);
    });

    it('should disable the disableAggregation button', () => {
      defaultProps.isDisabled = true;
      defaultProps.isRemovable = true;
      const comp = mount(<DefaultEditorAgg {...defaultProps} />);

      expect(
        comp
          .find('EuiButtonIcon[data-test-subj="toggleDisableAggregationBtn disable"]')
          .prop('disabled')
      ).toBeTruthy();
    });

    it('should enable agg', () => {
      defaultProps.agg.enabled = false;
      const comp = mount(<DefaultEditorAgg {...defaultProps} />);
      comp.find('[data-test-subj="toggleDisableAggregationBtn enable"] button').simulate('click');

      expect(defaultProps.onToggleEnableAgg).toBeCalledWith(defaultProps.agg.id, true);
    });

    it('should call removeAgg', () => {
      defaultProps.isRemovable = true;
      const comp = mount(<DefaultEditorAgg {...defaultProps} />);
      comp.find('[data-test-subj="removeDimensionBtn"] button').simulate('click');

      expect(defaultProps.removeAgg).toBeCalledWith(defaultProps.agg.id);
    });
  });

  describe('last bucket', () => {
    beforeEach(() => {
      defaultProps.isLastBucket = true;
      defaultProps.lastParentPipelineAggTitle = 'ParentPipelineAgg';
    });

    it('should disable min_doc_count when agg is histogram or date_histogram', () => {
      defaultProps.agg.type = {
        name: 'histogram',
      } as IAggType;
      const compHistogram = shallow(<DefaultEditorAgg {...defaultProps} />);
      defaultProps.agg.type = {
        name: 'date_histogram',
      } as IAggType;
      const compDateHistogram = shallow(<DefaultEditorAgg {...defaultProps} />);

      expect(compHistogram.find(DefaultEditorAggParams).props()).toHaveProperty('disabledParams', [
        'min_doc_count',
      ]);
      expect(compDateHistogram.find(DefaultEditorAggParams).props()).toHaveProperty(
        'disabledParams',
        ['min_doc_count']
      );
    });

    it('should set error when agg is not histogram or date_histogram', () => {
      defaultProps.agg.type = {
        name: 'aggType',
      } as IAggType;
      const comp = shallow(<DefaultEditorAgg {...defaultProps} />);

      expect(comp.find(DefaultEditorAggParams).prop('aggError')).toBeDefined();
    });

    it('should set min_doc_count to true when agg type was changed to histogram', () => {
      defaultProps.agg.type = {
        name: 'aggType',
      } as IAggType;
      const comp = mount(<DefaultEditorAgg {...defaultProps} />);
      comp.setProps({ agg: { ...defaultProps.agg, type: { name: 'histogram' } } });

      expect(defaultProps.setAggParamValue).toHaveBeenCalledWith(
        defaultProps.agg.id,
        'min_doc_count',
        true
      );
    });

    it('should set min_doc_count to 0 when agg type was changed to date_histogram', () => {
      defaultProps.agg.type = {
        name: 'aggType',
      } as IAggType;
      const comp = mount(<DefaultEditorAgg {...defaultProps} />);
      comp.setProps({ agg: { ...defaultProps.agg, type: { name: 'date_histogram' } } });

      expect(defaultProps.setAggParamValue).toHaveBeenCalledWith(
        defaultProps.agg.id,
        'min_doc_count',
        0
      );
    });
  });
});
