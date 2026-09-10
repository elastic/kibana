/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { MatchedItem } from '@kbn/data-views-plugin/public';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';
import { StatusMessage } from '.';

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
  it('should render normally', () => {
    const { container } = renderWithI18n(
      <StatusMessage
        isIncludingSystemIndices={false}
        matchedIndices={matchedIndices}
        query={''}
        showSystemIndices={false}
      />
    );

    expect(container.firstChild).toMatchSnapshot();
  });

  it('should render without a query', () => {
    renderWithI18n(
      <StatusMessage
        isIncludingSystemIndices={false}
        matchedIndices={matchedIndices}
        query={''}
        showSystemIndices={false}
      />
    );

    expect(
      screen.getByText(`Your index pattern can match ${matchedIndices.allIndices.length} sources.`)
    ).toBeVisible();
  });

  it('should render with exact matches', () => {
    const localMatchedIndices = {
      ...matchedIndices,
      exactMatchedIndices: [{ name: 'kibana', ...tagsPartial }] as unknown as MatchedItem[],
    };

    renderWithI18n(
      <StatusMessage
        isIncludingSystemIndices={false}
        matchedIndices={localMatchedIndices}
        query={'k*'}
        showSystemIndices={false}
      />
    );

    expect(screen.getByText('Your index pattern matches 1 source.')).toBeVisible();
  });

  it('should render with partial matches', () => {
    renderWithI18n(
      <StatusMessage
        isIncludingSystemIndices={false}
        matchedIndices={matchedIndices}
        query={'k'}
        showSystemIndices={false}
      />
    );

    expect(screen.getByTestId('createIndexPatternStatusMessage')).toHaveTextContent(
      /Your index pattern doesn't match any data streams, indices, or index aliases, but source is similar\./
    );
  });

  it('should render with no partial matches', () => {
    const localMatchedIndices = {
      ...matchedIndices,
      partialMatchedIndices: [],
    };

    renderWithI18n(
      <StatusMessage
        isIncludingSystemIndices={false}
        matchedIndices={localMatchedIndices}
        query={'k'}
        showSystemIndices={false}
      />
    );

    expect(screen.getByTestId('createIndexPatternStatusMessage')).toHaveTextContent(
      /The index pattern you entered doesn't match any data streams, indices, or index aliases. You can match 2 sources./
    );
  });

  it('should show that system indices exist', () => {
    renderWithI18n(
      <StatusMessage
        isIncludingSystemIndices={false}
        matchedIndices={{
          allIndices: [],
          exactMatchedIndices: [],
          partialMatchedIndices: [],
          visibleIndices: [],
        }}
        query={''}
        showSystemIndices={false}
      />
    );

    expect(
      screen.getByText('No data streams, indices, or index aliases match your index pattern.')
    ).toBeVisible();
  });

  it('should show that no indices exist', () => {
    renderWithI18n(
      <StatusMessage
        isIncludingSystemIndices={true}
        matchedIndices={{
          allIndices: [],
          exactMatchedIndices: [],
          partialMatchedIndices: [],
          visibleIndices: [],
        }}
        query={''}
        showSystemIndices={false}
      />
    );

    expect(
      screen.getByText('No data streams, indices, or index aliases match your index pattern.')
    ).toBeVisible();
  });
});
