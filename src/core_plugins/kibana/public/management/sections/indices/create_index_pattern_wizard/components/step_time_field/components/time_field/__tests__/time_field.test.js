import React from 'react';
import { TimeField } from '../time_field';
import { shallow } from 'enzyme';

describe('TimeField', () => {
  it('should render normally', () => {
    const component = shallow(
      <TimeField
        isVisible={true}
        fetchTimeFields={() => {}}
        timeFieldOptions={[{ text: '@timestamp', value: '@timestamp' }]}
        isLoading={false}
        selectedTimeField={''}
        onTimeFieldChanged={() => {}}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render something if hiding time field', () => {
    const component = shallow(
      <TimeField
        isVisible={false}
        fetchTimeFields={() => {}}
        timeFieldOptions={[{ text: '@timestamp', value: '@timestamp' }]}
        isLoading={false}
        selectedTimeField={''}
        onTimeFieldChanged={() => {}}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render a selected time field', () => {
    const component = shallow(
      <TimeField
        isVisible={true}
        fetchTimeFields={() => {}}
        timeFieldOptions={[{ text: '@timestamp', value: '@timestamp' }]}
        isLoading={false}
        selectedTimeField={'@timestamp'}
        onTimeFieldChanged={() => {}}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render a loading state', () => {
    const component = shallow(
      <TimeField
        isVisible={true}
        fetchTimeFields={() => {}}
        timeFieldOptions={[{ text: '@timestamp', value: '@timestamp' }]}
        isLoading={true}
        selectedTimeField={'@timestamp'}
        onTimeFieldChanged={() => {}}
      />
    );

    expect(component).toMatchSnapshot();
  });
});
