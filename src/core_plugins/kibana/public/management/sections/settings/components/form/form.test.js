import React from 'react';
import { shallow } from 'enzyme';

import { Form } from './form';

jest.mock('../field', () => ({
  Field: () => {
    return 'field';
  }
}));

const settings = {
  'dashboard': [
    {
      name: 'dashboard:test:setting',
      ariaName: 'dashboard test setting',
      displayName: 'Dashboard test setting',
      category: ['dashboard'],
    },
  ],
  'general': [
    {
      name: 'general:test:date',
      ariaName: 'general test date',
      displayName: 'Test date',
      description: 'bar',
      category: ['general'],
    },
    {
      name: 'setting:test',
      ariaName: 'setting test',
      displayName: 'Test setting',
      description: 'foo',
      category: ['general'],
    },
  ],
  'x-pack': [
    {
      name: 'xpack:test:setting',
      ariaName: 'xpack test setting',
      displayName: 'X-Pack test setting',
      category: ['x-pack'],
      description: 'bar',
    },
  ],
};
const categories = ['general', 'dashboard', 'hiddenCategory', 'x-pack'];
const categoryCounts = {
  general: 2,
  dashboard: 1,
  'x-pack': 10,
};
const save = () => {};
const clear = () => {};
const clearQuery = () => {};

describe('Form', () => {
  it('should render normally', async () => {
    const component = shallow(
      <Form
        settings={settings}
        categories={categories}
        categoryCounts={categoryCounts}
        save={save}
        clear={clear}
        clearQuery={clearQuery}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render no settings message when there are no settings', async () => {
    const component = shallow(
      <Form
        settings={{}}
        categories={categories}
        categoryCounts={categoryCounts}
        save={save}
        clear={clear}
        clearQuery={clearQuery}
      />
    );

    expect(component).toMatchSnapshot();
  });
});
