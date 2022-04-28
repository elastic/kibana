/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { StatusMessage } from '.';
import { shallow } from 'enzyme';
import { MatchedItem } from '../../../types';

const tagsPartial = {
  tags: [],
};

const matchedIndices = {
  allIndices: [
    { name: 'kibana', ...tagsPartial },
    { name: 'es', ...tagsPartial },
  ] as unknown as MatchedItem[],
  exactMatchedIndices: [] as MatchedItem[],
  partialMatchedIndices: [{ name: 'kibana', ...tagsPartial }] as unknown as MatchedItem[],
  visibleIndices: [],
};

describe('StatusMessage', () => {
  it('should render without a query', () => {
    const component = shallow(
      <StatusMessage
        matchedIndices={matchedIndices}
        query={''}
        isIncludingSystemIndices={false}
        showSystemIndices={false}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render with exact matches', () => {
    const localMatchedIndices = {
      ...matchedIndices,
      exactMatchedIndices: [{ name: 'kibana', ...tagsPartial }] as unknown as MatchedItem[],
    };

    const component = shallow(
      <StatusMessage
        matchedIndices={localMatchedIndices}
        query={'k*'}
        isIncludingSystemIndices={false}
        showSystemIndices={false}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render with partial matches', () => {
    const component = shallow(
      <StatusMessage
        matchedIndices={matchedIndices}
        query={'k'}
        isIncludingSystemIndices={false}
        showSystemIndices={false}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should render with no partial matches', () => {
    const localMatchedIndices = {
      ...matchedIndices,
      partialMatchedIndices: [],
    };

    const component = shallow(
      <StatusMessage
        matchedIndices={localMatchedIndices}
        query={'k'}
        isIncludingSystemIndices={false}
        showSystemIndices={false}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should show that system indices exist', () => {
    const component = shallow(
      <StatusMessage
        matchedIndices={{
          allIndices: [],
          exactMatchedIndices: [],
          partialMatchedIndices: [],
          visibleIndices: [],
        }}
        isIncludingSystemIndices={false}
        query={''}
        showSystemIndices={false}
      />
    );

    expect(component).toMatchSnapshot();
  });

  it('should show that no indices exist', () => {
    const component = shallow(
      <StatusMessage
        matchedIndices={{
          allIndices: [],
          exactMatchedIndices: [],
          partialMatchedIndices: [],
          visibleIndices: [],
        }}
        isIncludingSystemIndices={true}
        query={''}
        showSystemIndices={false}
      />
    );

    expect(component).toMatchSnapshot();
  });
});
