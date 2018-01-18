import React from 'react';
import { TimeField } from '../time_field';
import { shallow } from 'enzyme';

describe('TimeField', () => {
  it('should render normally', () => {
    const component = shallow(
      <TimeField
        showTimeField={true}
        fetchTimeFields={() => {}}
        timeFieldOptions={[{ text: '@timestamp', value: '@timestamp' }]}
        timeFields={[]}
        selectedTimeField={''}
        onTimeFieldChanged={() => {}}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render something if hiding time field', () => {
    const component = shallow(
      <TimeField
        showTimeField={false}
        fetchTimeFields={() => {}}
        timeFieldOptions={[{ text: '@timestamp', value: '@timestamp' }]}
        timeFields={[]}
        selectedTimeField={''}
        onTimeFieldChanged={() => {}}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render a selected time field', () => {
    const component = shallow(
      <TimeField
        showTimeField={true}
        fetchTimeFields={() => {}}
        timeFieldOptions={[{ text: '@timestamp', value: '@timestamp' }]}
        timeFields={[]}
        selectedTimeField={'@timestamp'}
        onTimeFieldChanged={() => {}}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render a loading state', () => {
    const component = shallow(
      <TimeField
        showTimeField={true}
        fetchTimeFields={() => {}}
        timeFieldOptions={[{ text: '@timestamp', value: '@timestamp' }]}
        timeFields={null}
        selectedTimeField={'@timestamp'}
        onTimeFieldChanged={() => {}}
      />
    );

    expect(component).toMatchSnapshot();
  });
});
