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
import { ColorRules } from './color_rules';
import { mountWithIntl } from 'test_utils/enzyme_helpers';

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
      const isNode = wrapper
        .find('div')
        .children()
        .exists();
      expect(isNode).toBeFalsy();
    });

    it('should render non-empty <div/> node', () => {
      const wrapper = mountWithIntl(<ColorRules.WrappedComponent {...defaultProps} />);
      const isNode = wrapper.find('div.tvbColorPicker').exists();

      expect(isNode).toBeTruthy();
    });
  });
});
