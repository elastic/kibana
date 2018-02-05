import React from 'react';
import { AdvancedOptions } from '../advanced_options';
import { shallow } from 'enzyme';

describe('AdvancedOptions', () => {
  it('should render normally', () => {
    const component = shallow(
      <AdvancedOptions
        showingAdvancedOptions={true}
        indexPatternId={'foobar'}
        toggleAdvancedOptions={() => {}}
        onChangeIndexPatternId={() => {}}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should hide if not showing', () => {
    const component = shallow(
      <AdvancedOptions
        showingAdvancedOptions={false}
        indexPatternId={'foobar'}
        toggleAdvancedOptions={() => {}}
        onChangeIndexPatternId={() => {}}
      />
    );

    expect(component).toMatchSnapshot();
  });
});
