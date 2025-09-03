/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { StatusMessage } from '.';
import { render } from '@testing-library/react';
import type { MatchedItem } from '@kbn/data-views-plugin/public';
import { IntlProvider } from 'react-intl';

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
  const Wrapper = (props) => <IntlProvider locale="en">{props.children}</IntlProvider>;

  it('should render without a query', () => {
    const { container } = render(
      <StatusMessage
        matchedIndices={matchedIndices}
        query={''}
        isIncludingSystemIndices={false}
        showSystemIndices={false}
      />,
      { wrapper: Wrapper }
    );

    expect(container.firstChild).toMatchSnapshot();
  });

  it('should render with exact matches', () => {
    const localMatchedIndices = {
      ...matchedIndices,
      exactMatchedIndices: [{ name: 'kibana', ...tagsPartial }] as unknown as MatchedItem[],
    };

    const { container } = render(
      <StatusMessage
        matchedIndices={localMatchedIndices}
        query={'k*'}
        isIncludingSystemIndices={false}
        showSystemIndices={false}
      />,
      { wrapper: Wrapper }
    );

    expect(container.firstChild).toMatchSnapshot();
  });

  it('should render with partial matches', () => {
    const { container } = render(
      <StatusMessage
        matchedIndices={matchedIndices}
        query={'k'}
        isIncludingSystemIndices={false}
        showSystemIndices={false}
      />,
      { wrapper: Wrapper }
    );

    expect(container.firstChild).toMatchSnapshot();
  });

  it('should render with no partial matches', () => {
    const localMatchedIndices = {
      ...matchedIndices,
      partialMatchedIndices: [],
    };

    const { container } = render(
      <StatusMessage
        matchedIndices={localMatchedIndices}
        query={'k'}
        isIncludingSystemIndices={false}
        showSystemIndices={false}
      />,
      { wrapper: Wrapper }
    );

    expect(container.firstChild).toMatchSnapshot();
  });

  it('should show that system indices exist', () => {
    const { container } = render(
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
      />,
      { wrapper: Wrapper }
    );

    expect(container.firstChild).toMatchSnapshot();
  });

  it('should show that no indices exist', () => {
    const { container } = render(
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
      />,
      { wrapper: Wrapper }
    );

    expect(container.firstChild).toMatchSnapshot();
  });
});
