/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { collectionActions } from './lib/collection_actions';
import { ColorRules } from './color_rules';
import { keys } from '@elastic/eui';
import { findTestSubject } from '@elastic/eui/lib/test';
import { mountWithIntl } from '@kbn/test/jest';

describe('src/legacy/core_plugins/metrics/public/components/color_rules.test.js', () => {
  let defaultProps;
  beforeAll(() => {
    defaultProps = {
      name: 'gauge_color_rules',
      model: {
        gauge_color_rules: [
          {
            gauge: null,
            value: 0,
            id: 'unique value',
          },
        ],
      },
      onChange: jest.fn(),
    };
  });
  describe('ColorRules', () => {
    it('should render empty <div/> node', () => {
      const emptyProps = {
        name: 'gauge_color_rules',
        model: {},
        onChange: jest.fn(),
      };
      const wrapper = mountWithIntl(<ColorRules.WrappedComponent {...emptyProps} />);
      const isNode = wrapper.find('div').children().exists();
      expect(isNode).toBeFalsy();
    });

    it('should render non-empty <div/> node', () => {
      const wrapper = mountWithIntl(<ColorRules.WrappedComponent {...defaultProps} />);
      const isNode = wrapper.find('div.tvbColorPicker').exists();

      expect(isNode).toBeTruthy();
    });
    it('should handle change of operator and value correctly', () => {
      collectionActions.handleChange = jest.fn();
      const wrapper = mountWithIntl(<ColorRules.WrappedComponent {...defaultProps} />);
      const operatorInput = findTestSubject(wrapper, 'colorRuleOperator');
      operatorInput.simulate('keyDown', { key: keys.ARROW_DOWN });
      operatorInput.simulate('keyDown', { key: keys.ARROW_DOWN });
      operatorInput.simulate('keyDown', { key: keys.ENTER });
      expect(collectionActions.handleChange.mock.calls[0][1].operator).toEqual('gt');

      const numberInput = findTestSubject(wrapper, 'colorRuleValue');
      numberInput.simulate('change', { target: { value: '123' } });
      expect(collectionActions.handleChange.mock.calls[1][1].value).toEqual(123);
    });
  });
});
