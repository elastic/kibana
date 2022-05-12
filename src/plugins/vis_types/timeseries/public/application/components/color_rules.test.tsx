/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { keys } from '@elastic/eui';
import { findTestSubject } from '@elastic/eui/lib/test';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import { collectionActions } from './lib/collection_actions';
import {
  ColorRules,
  ColorRulesProps,
  colorRulesOperatorsList,
  ColorRulesOperator,
} from './color_rules';
import { Operator } from '../../../common/operators_utils';

describe('src/legacy/core_plugins/metrics/public/components/color_rules.test.js', () => {
  const emptyRule: ColorRulesOperator = colorRulesOperatorsList.filter(
    (operator) => operator.method === Operator.Empty
  )[0];
  const notEmptyRule: ColorRulesOperator = colorRulesOperatorsList.filter(
    (operator) => operator.method !== Operator.Empty
  )[0];

  const getColorRulesProps = (gaugeColorRules: unknown = []) => ({
    name: 'gauge_color_rules',
    model: { gauge_color_rules: gaugeColorRules },
    onChange: jest.fn(),
  });

  const defaultProps = getColorRulesProps([
    {
      gauge: null,
      value: 0,
      id: 'unique value',
    },
  ]) as unknown as ColorRulesProps;

  const emptyColorRuleProps = getColorRulesProps([
    {
      operator: emptyRule?.method,
      value: emptyRule?.value,
      id: 'unique value',
    },
  ]) as unknown as ColorRulesProps;

  const notEmptyColorRuleProps = getColorRulesProps([
    {
      operator: notEmptyRule?.method,
      value: notEmptyRule?.value,
      id: 'unique value',
    },
  ]) as unknown as ColorRulesProps;

  describe('ColorRules', () => {
    it('should render empty <div/> node', () => {
      const emptyProps = {
        name: 'gauge_color_rules',
        model: {},
        onChange: jest.fn(),
      } as unknown as ColorRulesProps;
      const wrapper = mountWithIntl(<ColorRules {...emptyProps} />);
      const isNode = wrapper.find('div').children().exists();
      expect(isNode).toBeFalsy();
    });

    it('should render non-empty <div/> node', () => {
      const wrapper = mountWithIntl(<ColorRules {...defaultProps} />);
      const isNode = wrapper.find('div.tvbColorPicker').exists();

      expect(isNode).toBeTruthy();
    });

    it('should handle change of operator and value correctly', () => {
      collectionActions.handleChange = jest.fn();
      const wrapper = mountWithIntl(<ColorRules {...defaultProps} />);
      const operatorInput = findTestSubject(wrapper, 'colorRuleOperator');
      operatorInput.simulate('keyDown', { key: keys.ARROW_DOWN });
      operatorInput.simulate('keyDown', { key: keys.ARROW_DOWN });
      operatorInput.simulate('keyDown', { key: keys.ENTER });
      expect((collectionActions.handleChange as jest.Mock).mock.calls[0][1].operator).toEqual('gt');

      const numberInput = findTestSubject(wrapper, 'colorRuleValue');

      numberInput.simulate('change', { target: { value: '123' } });
      expect((collectionActions.handleChange as jest.Mock).mock.calls[1][1].value).toEqual(123);
    });

    it('should handle render of value field if empty value oparetor is selected by default', () => {
      collectionActions.handleChange = jest.fn();
      const wrapper = mountWithIntl(<ColorRules {...emptyColorRuleProps} />);
      const numberInput = findTestSubject(wrapper, 'colorRuleValue');
      expect(numberInput.exists()).toBeFalsy();
    });

    it('should handle render of value field if not empty operator is selected by default', () => {
      collectionActions.handleChange = jest.fn();
      const wrapper = mountWithIntl(<ColorRules {...notEmptyColorRuleProps} />);
      const numberInput = findTestSubject(wrapper, 'colorRuleValue');
      expect(numberInput.exists()).toBeTruthy();
    });
  });
});
