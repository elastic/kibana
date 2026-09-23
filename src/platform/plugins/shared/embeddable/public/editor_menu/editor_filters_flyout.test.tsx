/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import type { Filter, Query } from '@kbn/es-query';
import { BehaviorSubject } from 'rxjs';
import type { UnifiedSearchPublicPluginStart } from '@kbn/unified-search-plugin/public';
import { setStubKibanaServices } from '../mocks';
import type { EditorMenuManager } from './types';
import { EditorFiltersFlyout } from './editor_filters_flyout';

const menuManager = {
  flyoutId: 'editor',
  returnToEditor: jest.fn(),
} as unknown as EditorMenuManager;

const renderFlyout = () => {
  const closeFlyout = jest.fn();
  const setQuery = jest.fn();
  const setFilters = jest.fn();
  const query$ = new BehaviorSubject<Query | undefined>({ language: 'kuery', query: 'status:200' });
  const filters$ = new BehaviorSubject<Filter[] | undefined>([
    { meta: { alias: 'agent' }, query: { match: { agent: 'mozilla' } } },
  ]);
  render(
    <I18nProvider>
      <div id="editor-filters">
        <EditorFiltersFlyout
          api={{
            query$,
            filters$,
            timeRange$: new BehaviorSubject(undefined),
            setQuery,
            setFilters,
            setTimeRange: jest.fn(),
          }}
          closeFlyout={closeFlyout}
          menuManager={menuManager}
        />
      </div>
    </I18nProvider>
  );
  return { closeFlyout, setQuery, setFilters };
};

describe('EditorFiltersFlyout', () => {
  beforeEach(() => {
    const start = {
      ui: {
        SearchBar: ({ query }: { query?: Query }) => (
          <span>{typeof query?.query === 'string' ? query.query : ''}</span>
        ),
      },
    } as unknown as UnifiedSearchPublicPluginStart;
    setStubKibanaServices({ unifiedSearch: start });
  });

  it('saves the staged query and filters', () => {
    const { closeFlyout, setQuery, setFilters } = renderFlyout();

    expect(screen.getByText('status:200')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(setQuery).toHaveBeenCalledWith({ language: 'kuery', query: 'status:200' });
    expect(setFilters).toHaveBeenCalledWith([
      { meta: { alias: 'agent' }, query: { match: { agent: 'mozilla' } } },
    ]);
    expect(closeFlyout).toHaveBeenCalledTimes(1);
  });

  it('discards the draft on cancel', () => {
    const { closeFlyout, setQuery, setFilters } = renderFlyout();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(setQuery).not.toHaveBeenCalled();
    expect(setFilters).not.toHaveBeenCalled();
    expect(closeFlyout).toHaveBeenCalledTimes(1);
  });
});
