import React from 'react';
import { shallow } from 'enzyme';

import { Query } from '@elastic/eui';
import { Form } from '../form';

jest.mock('../../field', () => ({
  Field: () => {
    return 'field';
  }
}));

const settings = [
  {
    name: 'dashboard:test:setting',
    category: 'dashboard',
  },
  {
    name: 'general:test:date',
    description: 'bar',
    category: 'general',
  },
  {
    name: 'setting:test',
    description: 'foo',
    category: 'general',
  },
  {
    name: 'xpack:test:setting',
    category: 'x-pack',
    description: 'bar',
  }
];
const save = () => {};
const clear = () => {};
const query = Query.parse('category:general date');

describe('Form', () => {
  it('should render normally', async () => {
    const component = shallow(
      <Form
        settings={settings}
        save={save}
        clear={clear}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should filter based on the query bar', async () => {
    const component = shallow(
      <Form
        settings={settings}
        save={save}
        clear={clear}
      />
    );

    component.instance().onQueryChange(query);
    component.update();
    expect(component).toMatchSnapshot();
  });
});
