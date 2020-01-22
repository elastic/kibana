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
import { shallow } from 'enzyme';
import dedent from 'dedent';

import { AdvancedSettings } from './advanced_settings';

jest.mock('./components/field', () => ({
  Field: () => {
    return 'field';
  },
}));

jest.mock('./components/call_outs', () => ({
  CallOuts: () => {
    return 'callOuts';
  },
}));

jest.mock('./components/search', () => ({
  Search: () => {
    return 'search';
  },
}));

const config = {
  set: () => {},
  remove: () => {},
  isCustom: setting => setting.isCustom,
  isOverridden: key => Boolean(config.getAll()[key].isOverridden),
  getAll: () => {
    return {
      'test:array:setting': {
        value: ['default_value'],
        name: 'Test array setting',
        description: 'Description for Test array setting',
        category: ['elasticsearch'],
      },
      'test:boolean:setting': {
        value: true,
        name: 'Test boolean setting',
        description: 'Description for Test boolean setting',
        category: ['elasticsearch'],
      },
      'test:image:setting': {
        value: null,
        name: 'Test image setting',
        description: 'Description for Test image setting',
        type: 'image',
      },
      'test:json:setting': {
        value: '{"foo": "bar"}',
        name: 'Test json setting',
        description: 'Description for Test json setting',
        type: 'json',
      },
      'test:markdown:setting': {
        value: '',
        name: 'Test markdown setting',
        description: 'Description for Test markdown setting',
        type: 'markdown',
      },
      'test:number:setting': {
        value: 5,
        name: 'Test number setting',
        description: 'Description for Test number setting',
      },
      'test:select:setting': {
        value: 'orange',
        name: 'Test select setting',
        description: 'Description for Test select setting',
        type: 'select',
        options: ['apple', 'orange', 'banana'],
      },
      'test:string:setting': {
        value: null,
        name: 'Test string setting',
        description: 'Description for Test string setting',
        type: 'string',
        isCustom: true,
      },
      'test:readonlystring:setting': {
        value: null,
        name: 'Test readonly string setting',
        description: 'Description for Test readonly string setting',
        type: 'string',
        readonly: true,
      },
      'test:customstring:setting': {
        value: null,
        name: 'Test custom string setting',
        description: 'Description for Test custom string setting',
        type: 'string',
        isCustom: true,
      },
      'test:isOverridden:string': {
        isOverridden: true,
        value: 'foo',
        name: 'An overridden string',
        description: 'Description for overridden string',
        type: 'string',
      },
      'test:isOverridden:number': {
        isOverridden: true,
        value: 1234,
        name: 'An overridden number',
        description: 'Description for overridden number',
        type: 'number',
      },
      'test:isOverridden:json': {
        isOverridden: true,
        value: dedent`
          {
            "foo": "bar"
          }
        `,
        name: 'An overridden json',
        description: 'Description for overridden json',
        type: 'json',
      },
      'test:isOverridden:select': {
        isOverridden: true,
        value: 'orange',
        name: 'Test overridden select setting',
        description: 'Description for overridden select setting',
        type: 'select',
        options: ['apple', 'orange', 'banana'],
      },
    };
  },
};

describe('AdvancedSettings', () => {
  it('should render normally', async () => {
    const component = shallow(<AdvancedSettings config={config} enableSaving={true} />);

    expect(component).toMatchSnapshot();
  });

  it('should render specific setting if given setting key', async () => {
    const component = shallow(
      <AdvancedSettings config={config} query="test:string:setting" enableSaving={true} />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render read-only when saving is disabled', async () => {
    const component = shallow(
      <AdvancedSettings config={config} query="test:string:setting" enableSaving={false} />
    );

    expect(component).toMatchSnapshot();
  });
});
