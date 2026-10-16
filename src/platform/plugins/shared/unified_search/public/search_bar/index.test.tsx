/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { DataViewSource } from '@kbn/data-source';
import { createMockEsqlSource } from '@kbn/data-source/src/__mocks__/esql_source.mock';
import { DataView } from '@kbn/data-views-plugin/common';
import { SearchBar } from '.';

jest.mock('../ui_module', () => ({
  SearchBar: (props: { indexPatterns?: Array<{ id?: string }>; dataSources?: unknown }) => (
    <div
      data-test-subj="searchBar"
      data-patterns={JSON.stringify((props.indexPatterns ?? []).map(({ id }) => id))}
      data-has-data-sources={String('dataSources' in props)}
    />
  ),
}));

const createDataView = (id: string) =>
  new DataView({
    spec: { id, title: `${id}-*`, fields: {} },
    fieldFormats: {} as DataView['fieldFormats'],
  });

const patterns = async () => {
  const element = await screen.findByTestId('searchBar');
  return JSON.parse(element.getAttribute('data-patterns') ?? '[]');
};

describe('SearchBar', () => {
  it('passes the explicit index patterns as they are', async () => {
    render(<SearchBar indexPatterns={[createDataView('explicit')]} />);

    expect(await patterns()).toEqual(['explicit']);
  });

  it('turns the data sources into the index patterns of the search bar', async () => {
    const esqlSource = createMockEsqlSource([], [], '@timestamp');

    render(<SearchBar dataSources={[new DataViewSource(createDataView('dsl')), esqlSource]} />);

    await waitFor(async () => expect(await patterns()).toEqual(['dsl', esqlSource.datasetId]));
  });

  it('keeps the explicit index patterns next to the data sources', async () => {
    render(
      <SearchBar
        indexPatterns={[createDataView('explicit')]}
        dataSources={[new DataViewSource(createDataView('dsl'))]}
      />
    );

    await waitFor(async () => expect(await patterns()).toEqual(['explicit', 'dsl']));
  });

  it('does not pass the data sources on to the search bar', async () => {
    render(<SearchBar dataSources={[new DataViewSource(createDataView('dsl'))]} />);

    const element = await screen.findByTestId('searchBar');
    expect(element.getAttribute('data-has-data-sources')).toBe('false');
  });
});
