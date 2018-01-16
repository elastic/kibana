import React from 'react';
import { Header } from '../header';
import { shallow } from 'enzyme';

describe('Header', () => {
  it('should render normally', () => {
    const component = shallow(
      <Header
        isInputInvalid={false}
        errors={[]}
        characterList={['%']}
        query={'k'}
        onQueryChanged={() => {}}
        goToNextStep={() => {}}
        isNextStepDisabled={false}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should mark the input as invalid', () => {
    const component = shallow(
      <Header
        isInputInvalid={true}
        errors={['Input is invalid']}
        characterList={['%']}
        query={'%'}
        onQueryChanged={() => {}}
        goToNextStep={() => {}}
        isNextStepDisabled={true}
      />
    );

    expect(component).toMatchSnapshot();
  });
});
