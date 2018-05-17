import React from 'react';
import { shallow, mount } from 'enzyme';

import { Query } from '@elastic/eui';
import { Search } from './search';

const query = Query.parse('');
const categories = ['general', 'dashboard', 'hiddenCategory', 'x-pack'];

describe('Search', () => {
  it('should render normally', async () => {
    const onQueryChange = () => {};
    const component = shallow(
      <Search
        query={query}
        categories={categories}
        onQueryChange={onQueryChange}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should call parent function when query is changed', async () => {
    const onQueryChange = jest.fn();
    const component = mount(
      <Search
        query={query}
        categories={categories}
        onQueryChange={onQueryChange}
      />
    );
    component.find('input').simulate('keyUp');
    component.find('EuiSearchFilters').prop('onChange')(query);
    expect(onQueryChange).toHaveBeenCalledTimes(2);
  });
});
