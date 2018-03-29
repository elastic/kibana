import React from 'react';
import { shallow } from 'enzyme';

import { AdvancedSettings } from '../advanced_settings';


jest.mock('../components/field', () => ({
  Field: () => {
    return 'field';
  }
}));
jest.mock('../components/call_outs', () => ({
  CallOuts: () => {
    return 'callOuts';
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
        description: 'Test array setting',
        category: 'elasticsearch',
      },
      'test:boolean:setting': {
        value: true,
        description: 'Test boolean setting',
        category: 'elasticsearch',
      },
      'test:image:setting': {
        value: null,
        description: 'Test image setting',
        type: 'image',
      },
      'test:json:setting': {
        value: '{"foo": "bar"}',
        description: 'Test json setting',
        type: 'json',
      },
      'test:markdown:setting': {
        value: '',
        description: 'Test markdown setting',
        type: 'markdown',
      },
      'test:number:setting': {
        value: 5,
        description: 'Test number setting',
      },
      'test:select:setting': {
        value: 'orange',
        description: 'Test select setting',
        type: 'select',
        options: ['apple', 'orange', 'banana'],
      },
      'test:string:setting': {
        value: null,
        description: 'Test string setting',
        type: 'string',
        isCustom: true,
      },
      'test:readonlystring:setting': {
        value: null,
        description: 'Test readonly string setting',
        type: 'string',
        readonly: true,
      },
      'test:customstring:setting': {
        value: null,
        description: 'Test custom string setting',
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
});
