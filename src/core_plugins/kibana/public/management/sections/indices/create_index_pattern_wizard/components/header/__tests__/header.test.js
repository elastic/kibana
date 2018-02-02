import React from 'react';
import { Header } from '../header';
import { shallow } from 'enzyme';

describe('Header', () => {
  it('should render normally', () => {
    const component = shallow(
      <Header
        isIncludingSystemIndices={true}
        onChangeIncludingSystemIndices={() => {}}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render without including system indices', () => {
    const component = shallow(
      <Header
        isIncludingSystemIndices={false}
        onChangeIncludingSystemIndices={() => {}}
      />
    );

    expect(component).toMatchSnapshot();
  });
});
