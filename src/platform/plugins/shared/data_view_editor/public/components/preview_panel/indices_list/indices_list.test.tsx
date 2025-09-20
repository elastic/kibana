/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import type { IndicesListProps } from './indices_list';
import { IndicesList, PER_PAGE_STORAGE_KEY } from './indices_list';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { MatchedItem } from '@kbn/data-views-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { IntlProvider } from 'react-intl';

const indices = [
  { name: 'kibana', tags: [] },
  { name: 'es', tags: [] },
] as unknown as MatchedItem[];

const similarIndices = [
  { name: 'logstash', tags: [] },
  { name: 'some_logs', tags: [] },
] as unknown as MatchedItem[];

describe('IndicesList', () => {
  const commonProps: Omit<IndicesListProps, 'query'> = {
    indices,
    isExactMatch: jest.fn(() => false),
  };
  const Wrapper = (props) => <IntlProvider locale="en">{props.children}</IntlProvider>;
  const user = userEvent.setup();

  afterEach(() => {
    new Storage(localStorage).remove(PER_PAGE_STORAGE_KEY);
  });

  it('should render normally', () => {
    const { container } = render(<IndicesList {...commonProps} query="" />, { wrapper: Wrapper });

    expect(container.firstChild).toMatchSnapshot();
  });

  it('should change pages', async () => {
    const lotsOfIndices = Array.from({ length: 15 }).map((_, i) => ({
      name: `index-${i}`,
      tags: [],
    })) as unknown as MatchedItem[];
    const { container } = render(
      <IndicesList {...commonProps} indices={lotsOfIndices} query="" />,
      { wrapper: Wrapper }
    );

    await user.click(screen.getByTestId('pagination-button-next'));

    expect(container.firstChild).toMatchSnapshot();
  });

  it('should change per page', async () => {
    const { container } = render(<IndicesList {...commonProps} query="" />, { wrapper: Wrapper });

    await user.click(screen.getByText('Rows per page: 10'));
    await user.click(screen.getByText('5'));

    expect(container.firstChild).toMatchSnapshot();
  });

  it('should highlight the query in the matches', () => {
    const { container } = render(
      <IndicesList
        {...commonProps}
        query="es,ki"
        isExactMatch={(indexName) => indexName === 'es'}
      />,
      { wrapper: Wrapper }
    );

    expect(container.firstChild).toMatchSnapshot();
  });

  it('should highlight fully when an exact match', () => {
    const { container } = render(
      <IndicesList
        {...commonProps}
        indices={similarIndices}
        query="logs*"
        isExactMatch={(indexName) => indexName === 'some_logs'}
      />,
      { wrapper: Wrapper }
    );

    expect(container.firstChild).toMatchSnapshot();
  });

  describe('updating props', () => {
    it('should render all new indices', () => {
      const { container, rerender } = render(<IndicesList {...commonProps} query="" />, {
        wrapper: Wrapper,
      });

      const moreIndices = [
        ...indices,
        ...indices,
        ...indices,
        ...indices,
        ...indices,
        ...indices,
        ...indices,
        ...indices,
      ];

      rerender(<IndicesList {...commonProps} indices={moreIndices} query="" />);
      expect(container.firstChild).toMatchSnapshot();
    });
  });
});
