/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
import type { Filter } from '@kbn/es-query';
import type { FilterableSource } from '@kbn/data-source';
import { coreMock } from '@kbn/core/public/mocks';
import { FilterItemComponent } from './filter_item';

const { uiSettings, docLinks } = coreMock.createStart();

// Mirrors the real helpers: data view lookup by id, and a throw when the data view is known but the field is not
jest.mock('@kbn/data-plugin/public', () => {
  const getIndexPatternFromFilter = (filter: Filter, dataViews: FilterableSource[]) =>
    dataViews.find((dataView) => dataView.id === filter.meta.index);
  return {
    getIndexPatternFromFilter,
    getDisplayValueFromFilter: (filter: Filter, dataViews: FilterableSource[]) => {
      const dataView = getIndexPatternFromFilter(filter, dataViews);
      if (dataView && !dataView.fields.some((field) => field.name === filter.meta.key)) {
        throw new Error(`Field ${filter.meta.key} not found in data view ${dataView.title}`);
      }
      return String(filter.meta.params?.query ?? '');
    },
  };
});

jest.mock('@kbn/css-utils/public/use_memo_css', () => ({
  useMemoCss: () => ({}),
}));

// Surface the props computed by FilterItem (test subjects, status and message) that FilterView renders
jest.mock('../filter_view', () => ({
  FilterView: (props: Record<string, string>) => (
    <div
      data-test-subj={props['data-test-subj']}
      data-label-status={props.filterLabelStatus}
      data-error-message={props.errorMessage}
    />
  ),
}));

jest.mock('../filter_editor/filter_editor', () => ({
  FilterEditor: () => null,
}));

jest.mock('../filter_editor', () => ({
  withCloseFilterEditorConfirmModal: (Component: React.ComponentType<any>) => Component,
}));

const ANIMALS_DATA_VIEW_ID = 'animals';
// Not part of the current view; can't be told apart from a deleted data view
const UNKNOWN_DATA_VIEW_ID = 'unknown';

// The "current view": only the animals data view is available
const dataViews = [
  {
    id: ANIMALS_DATA_VIEW_ID,
    title: 'animals-*',
    fields: [{ name: 'name' }, { name: '@timestamp' }],
  },
] as unknown as FilterableSource[];

const buildPhraseFilter = (key: string, value: string, { index }: { index?: string }): Filter => ({
  meta: { index, type: 'phrase', key, params: { query: value }, negate: false, disabled: false },
  query: { match_phrase: { [key]: value } },
});

const renderFilter = (filter: Filter) => {
  const { container } = render(
    <FilterItemComponent
      id="0"
      filter={filter}
      indexPatterns={dataViews}
      readOnly
      onUpdate={jest.fn()}
      onRemove={jest.fn()}
      intl={
        { formatMessage: ({ defaultMessage }: { defaultMessage: string }) => defaultMessage } as any
      }
      uiSettings={uiSettings}
      docLinks={docLinks}
      onCloseFilterPopover={jest.fn()}
      onLocalFilterCreate={jest.fn()}
      onLocalFilterUpdate={jest.fn()}
    />
  );
  const badge = container.firstElementChild!;
  return {
    subjects: badge.getAttribute('data-test-subj')!.split(' '),
    labelStatus: badge.getAttribute('data-label-status'),
    errorMessage: badge.getAttribute('data-error-message'),
  };
};

describe('FilterItemComponent with bad filters', () => {
  it('unknown data view, field found: rendered without warning', () => {
    const { subjects, labelStatus, errorMessage } = renderFilter(
      buildPhraseFilter('name', 'moo', { index: UNKNOWN_DATA_VIEW_ID })
    );

    expect(labelStatus).toBe('');
    expect(errorMessage).toBeFalsy();
    expect(subjects).toEqual(
      expect.arrayContaining(['filter-key-name', 'filter-value-moo', 'filter-enabled'])
    );
  });

  it('known data view, field missing: rendered with warning', () => {
    const { subjects, labelStatus, errorMessage } = renderFilter(
      buildPhraseFilter('baad-field', 'moo', { index: ANIMALS_DATA_VIEW_ID })
    );

    expect(labelStatus).toBe('warn');
    expect(errorMessage).toBe('Field baad-field not found in data view animals-*');
    expect(subjects).toEqual(
      expect.arrayContaining(['filter-key-baad-field', 'filter-value-warn', 'filter-enabled'])
    );
  });

  it('unknown data view, field not found: rendered with warning', () => {
    const { subjects, labelStatus, errorMessage } = renderFilter(
      buildPhraseFilter('extension', 'jpg', { index: UNKNOWN_DATA_VIEW_ID })
    );

    expect(labelStatus).toBe('warn');
    expect(errorMessage).toContain('exist in the current view');
    expect(subjects).toEqual(
      expect.arrayContaining(['filter-key-extension', 'filter-value-warn', 'filter-enabled'])
    );
  });
});
