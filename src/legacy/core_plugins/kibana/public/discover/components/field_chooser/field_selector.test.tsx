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

import { FieldSelector } from './field_selector';
// @ts-ignore
import React from 'react';
import { shallow } from 'enzyme';
import { EuiSelect } from '@elastic/eui';

describe('FieldSelector', () => {
  const props = {
    onChange: jest.fn(),
    id: 'type',
    value: 'any',
    options: [
      { value: 'any', text: 'any' },
      { value: 'true', text: 'yes' },
      { value: 'false', text: 'no' },
    ],
    label: 'Test Title',
  };
  function mountComponent() {
    const comp = shallow(<FieldSelector {...props} />);
    const title = comp.find('h4');
    const select = comp.find(EuiSelect);
    return { comp, title, select };
  }

  test('component renders correctly', () => {
    const { comp } = mountComponent();
    expect(comp).toMatchSnapshot();
  });

  test('on value change calls onChange', () => {
    const { select } = mountComponent();
    select.simulate('change', { target: { value: 'true' } });
    expect(props.onChange).toHaveBeenCalledWith(props.id, 'true');
  });
});
