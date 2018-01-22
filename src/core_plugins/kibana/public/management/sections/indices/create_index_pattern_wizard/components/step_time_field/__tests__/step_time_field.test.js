import React from 'react';
import { shallow } from 'enzyme';

import { StepTimeField } from '../step_time_field';

jest.mock('../components/header', () => ({ Header: 'Header' }));
jest.mock('../components/time_field', () => ({ TimeField: 'TimeField' }));
jest.mock('../components/advanced_options', () => ({ AdvancedOptions: 'AdvancedOptions' }));
jest.mock('../components/action_buttons', () => ({ ActionButtons: 'ActionButtons' }));
jest.mock('../../../lib/extract_time_fields', () => ({
  extractTimeFields: fields => fields,
}));

const noop = () => {};
const indexPatternsService = {
  fieldsFetcher: {
    fetchForWildcard: noop,
  }
};

describe('StepTimeField', () => {
  it('should render normally', () => {
    const component = shallow(
      <StepTimeField
        indexPattern="ki*"
        indexPatternsService={indexPatternsService}
        goToPreviousStep={noop}
        createIndexPattern={noop}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render timeFields', () => {
    const component = shallow(
      <StepTimeField
        indexPattern="ki*"
        indexPatternsService={indexPatternsService}
        goToPreviousStep={noop}
        createIndexPattern={noop}
      />
    );

    component.setState({
      timeFields: [
        { display: '@timestamp', fieldName: '@timestamp' },
        { display: 'name', fieldName: 'name' },
      ]
    });

    expect(component).toMatchSnapshot();
  });

  it('should render a selected timeField', () => {
    const component = shallow(
      <StepTimeField
        indexPattern="ki*"
        indexPatternsService={indexPatternsService}
        goToPreviousStep={noop}
        createIndexPattern={noop}
      />
    );

    component.setState({
      timeFields: [
        { display: '@timestamp', fieldName: '@timestamp' },
        { display: 'name', fieldName: 'name' },
      ],
      selectedTimeField: '@timestamp',
    });

    expect(component).toMatchSnapshot();
  });

  it('should render advanced options', () => {
    const component = shallow(
      <StepTimeField
        indexPattern="ki*"
        indexPatternsService={indexPatternsService}
        goToPreviousStep={noop}
        createIndexPattern={noop}
      />
    );

    component.setState({ showingAdvancedOptions: true });

    expect(component).toMatchSnapshot();
  });

  it('should render advanced options with an index pattern id', () => {
    const component = shallow(
      <StepTimeField
        indexPattern="ki*"
        indexPatternsService={indexPatternsService}
        goToPreviousStep={noop}
        createIndexPattern={noop}
      />
    );

    component.setState({
      showingAdvancedOptions: true,
      indexPatternId: 'foobar',
    });

    expect(component).toMatchSnapshot();
  });

  it('should render a loading state when creating the index pattern', () => {
    const component = shallow(
      <StepTimeField
        indexPattern="ki*"
        indexPatternsService={indexPatternsService}
        goToPreviousStep={noop}
        createIndexPattern={noop}
      />
    );

    component.setState({ isCreating: true });

    expect(component).toMatchSnapshot();
  });
});
