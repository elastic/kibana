import React from 'react';
import { StatusMessage } from '../status_message';
import { shallow } from 'enzyme';

const matchedIndices = {
  allIndices: [
    { name: 'kibana' },
    { name: 'es' }
  ],
  exactMatchedIndices: [],
  partialMatchedIndices: [
    { name: 'kibana' }
  ],
};

describe('StatusMessage', () => {
  it('should render without a query', () => {
    const component = shallow(
      <StatusMessage
        matchedIndices={matchedIndices}
        query={''}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render with exact matches', () => {
    const localMatchedIndices = {
      ...matchedIndices,
      exactMatchedIndices: [
        { name: 'kibana' }
      ]
    };

    const component = shallow(
      <StatusMessage
        matchedIndices={localMatchedIndices}
        query={'k*'}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render with partial matches', () => {
    const component = shallow(
      <StatusMessage
        matchedIndices={matchedIndices}
        query={'k'}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render with no partial matches', () => {
    const localMatchedIndices = {
      ...matchedIndices,
      partialMatchedIndices: []
    };

    const component = shallow(
      <StatusMessage
        matchedIndices={localMatchedIndices}
        query={'k'}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should show that system indices exist', () => {
    const component = shallow(
      <StatusMessage
        matchedIndices={[]}
        isIncludingSystemIndices={false}
        query={''}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should show that no indices exist', () => {
    const component = shallow(
      <StatusMessage
        matchedIndices={[]}
        isIncludingSystemIndices={true}
        query={''}
      />
    );

    expect(component).toMatchSnapshot();
  });
});
