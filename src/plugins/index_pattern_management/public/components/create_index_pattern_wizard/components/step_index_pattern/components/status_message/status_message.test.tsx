/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React from 'react';
import { StatusMessage } from '../status_message';
import { shallow } from 'enzyme';
import { MatchedItem } from '../../../../types';

const tagsPartial = {
  tags: [],
};

const matchedIndices = {
  allIndices: ([
    { name: 'kibana', ...tagsPartial },
    { name: 'es', ...tagsPartial },
  ] as unknown) as MatchedItem[],
  exactMatchedIndices: [] as MatchedItem[],
  partialMatchedIndices: ([{ name: 'kibana', ...tagsPartial }] as unknown) as MatchedItem[],
};
const defaultProps = {
  matchedIndices,
  query: [],
  isIncludingSystemIndices: false,
  showSystemIndices: false,
};

describe('StatusMessage', () => {
  it('should render without a query', () => {
    const component = shallow(<StatusMessage {...defaultProps} />);

    expect(component).toMatchSnapshot();
  });

  it('should render with exact matches', () => {
    const localMatchedIndices = {
      ...matchedIndices,
      exactMatchedIndices: ([{ name: 'kibana', ...tagsPartial }] as unknown) as MatchedItem[],
    };

    const testProps = {
      ...defaultProps,
      matchedIndices: localMatchedIndices,
      query: ['k*'],
    };

    const component = shallow(<StatusMessage {...testProps} />);

    expect(component).toMatchSnapshot();
  });

  it('should render with partial matches', () => {
    const testProps = {
      ...defaultProps,
      query: ['k'],
    };
    const component = shallow(<StatusMessage {...testProps} />);

    expect(component).toMatchSnapshot();
  });

  it('should render with no partial matches', () => {
    const localMatchedIndices = {
      ...matchedIndices,
      partialMatchedIndices: [],
    };

    const testProps = {
      ...defaultProps,
      matchedIndices: localMatchedIndices,
      query: ['k'],
    };
    const component = shallow(<StatusMessage {...testProps} />);

    expect(component).toMatchSnapshot();
  });

  it('should show that system indices exist', () => {
    const testProps = {
      ...defaultProps,
      matchedIndices: {
        allIndices: [],
        exactMatchedIndices: [],
        partialMatchedIndices: [],
      },
      query: [],
    };
    const component = shallow(<StatusMessage {...testProps} />);

    expect(component).toMatchSnapshot();
  });

  it('should show that no indices exist', () => {
    const testProps = {
      ...defaultProps,
      matchedIndices: {
        allIndices: [],
        exactMatchedIndices: [],
        partialMatchedIndices: [],
      },
      query: [],
      isIncludingSystemIndices: true,
    };
    const component = shallow(<StatusMessage {...testProps} />);

    expect(component).toMatchSnapshot();
  });
});
