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
import { render } from 'enzyme';
import { requiredProps } from '../../test/required_props';

import { KuiFlexItem } from './flex_item';

describe('KuiFlexItem', () => {
  test('is rendered', () => {
    const component = render(
      <KuiFlexItem {...requiredProps} />
    );

    expect(component)
      .toMatchSnapshot();
  });

  test('tests the grow prop correctly', () => {
    const propType = KuiFlexItem.propTypes.grow;

    const validValues = [undefined, null, true, false, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const invalidValues = ['true', 'false', '1', 0];

    validValues.forEach(value =>
      expect(propType({ grow: value }, `grow`)).toBe(undefined)
    );

    invalidValues.forEach(value =>
      expect(propType({ grow: value }, `grow`) instanceof Error).toBe(true)
    );
  });
});
