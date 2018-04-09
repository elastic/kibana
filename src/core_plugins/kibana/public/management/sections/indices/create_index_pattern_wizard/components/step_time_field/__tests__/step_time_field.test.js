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
      timeFieldSet: true,
    });

    expect(component).toMatchSnapshot();
  });

  it('should ensure disabled time field options work properly', () => {
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
    });

    // If the value is undefined, that means the user selected the
    // `I don't want to use a Time filter` option
    component.instance().onTimeFieldChanged({ target: { value: undefined } });
    expect(component.state('timeFieldSet')).toBe(true);

    // If the value is an empty string, that means the user selected
    // an invalid selection (like the empty selection or the `-----`)
    component.instance().onTimeFieldChanged({ target: { value: '' } });
    expect(component.state('timeFieldSet')).toBe(false);
  });

  it('should disable the action button if an invalid time field is selected', () => {
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
    });

    component.instance().onTimeFieldChanged({ target: { value: '' } });
    component.update();

    expect(component.find('ActionButtons')).toMatchSnapshot();
  });

  it('should enable the action button if the user decides to not select a time field', () => {
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
    });

    component.instance().onTimeFieldChanged({ target: { value: undefined } });
    component.update();

    expect(component.find('ActionButtons')).toMatchSnapshot();
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
