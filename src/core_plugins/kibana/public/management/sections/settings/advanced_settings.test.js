import React from 'react';
import { shallow } from 'enzyme';

import { AdvancedSettings } from './advanced_settings';

jest.mock('./components/field', () => ({
  Field: () => {
    return 'field';
  }
}));

jest.mock('./components/call_outs', () => ({
  CallOuts: () => {
    return 'callOuts';
  }
}));

jest.mock('./components/search', () => ({
  Search: () => {
    return 'search';
  }
}));

const config = {
  set: () => {},
  remove: () => {},
  isCustom: (setting) => setting.isCustom,
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
    };
  }
};

describe('AdvancedSettings', () => {

  it('should render normally', async () => {
    const component = shallow(
      <AdvancedSettings
        config={config}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render specific setting if given setting key', async () => {
    const component = shallow(
      <AdvancedSettings
        config={config}
        query="test:string:setting"
      />
    );

    expect(component).toMatchSnapshot();
  });
});
