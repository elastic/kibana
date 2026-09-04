/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import type { DataTableColumnsMeta, EsHitRecord } from '@kbn/discover-utils/types';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { InTableSearchCellContext } from '@kbn/data-grid-in-table-search';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import { SourceDocumentJsonMode } from './source_document_json_mode';
import { UnifiedDataTableContext } from '../table_context';
import { dataTableContextMock } from '../../__mocks__/table_context';
import { getNodeId } from './json_tree_viewer/tree_model';
import type { JsonModeSettings } from '../types';
import { MAX_TREE_VALUES } from '../utils/build_document_tree';

const rowTestId = (path: string) => `jsonTreeViewerRow-${getNodeId(path.split('.'))}`;
const filterForTestId = (path: string) => `jsonTreeViewerFilterFor-${path}`;
const filterOutTestId = (path: string) => `jsonTreeViewerFilterOut-${path}`;

const fieldFormats = fieldFormatsServiceMock.createStartContract();

const hitWithFields: EsHitRecord = {
  _id: '1',
  _index: 'test',
  _source: { bytes: 100, extension: '.gz' },
};

const renderCell = (
  hit: EsHitRecord,
  {
    shouldShowFieldHandler = () => true,
    inTableSearch,
    jsonModeSettings,
    selectedColumns,
    onFilter,
    hideFilteringOnComputedColumns,
    columnsMeta,
    isPlainRecord,
  }: {
    shouldShowFieldHandler?: (fieldName: string) => boolean;
    inTableSearch?: { term: string; isCounting: boolean };
    jsonModeSettings?: JsonModeSettings;
    selectedColumns?: string[];
    onFilter?: DocViewFilterFn;
    hideFilteringOnComputedColumns?: boolean;
    columnsMeta?: DataTableColumnsMeta;
    isPlainRecord?: boolean;
  } = {}
) => {
  let cell = (
    <SourceDocumentJsonMode
      row={buildDataTableRecord(hit, dataViewMock)}
      dataView={dataViewMock}
      columnsMeta={columnsMeta}
      shouldShowFieldHandler={shouldShowFieldHandler}
      fieldFormats={fieldFormats}
      jsonModeSettings={jsonModeSettings}
      selectedColumns={selectedColumns}
    />
  );

  if (inTableSearch) {
    cell = (
      <InTableSearchCellContext.Provider
        value={{ inTableSearchTerm: inTableSearch.term, isCounting: inTableSearch.isCounting }}
      >
        {cell}
      </InTableSearchCellContext.Provider>
    );
  }

  if (onFilter) {
    cell = (
      <UnifiedDataTableContext.Provider
        value={{
          ...dataTableContextMock,
          dataView: dataViewMock,
          onFilter,
          hideFilteringOnComputedColumns,
          isPlainRecord,
        }}
      >
        {cell}
      </UnifiedDataTableContext.Provider>
    );
  }

  return renderWithI18n(cell);
};

describe('SourceDocumentJsonMode', () => {
  it('warns when the document is too large and gets truncated', () => {
    // One field past the budget forces flattenedToNestedDocument to cap the document.
    const fields = Object.fromEntries(
      Array.from({ length: MAX_TREE_VALUES + 1 }, (_, i) => [`field_${i}`, [i]])
    );

    renderCell({ _id: '1', _index: 'test', _source: undefined, fields });

    expect(screen.getByTestId('sourceDocumentTruncatedWarning')).toBeVisible();
    expect(screen.getByTestId('jsonTreeViewer')).toBeVisible();
  });

  describe('selectedColumns filter', () => {
    it('renders only the selected fields when columns are selected', () => {
      const { container } = renderCell(hitWithFields, { selectedColumns: ['bytes'] });

      expect(screen.getByTestId('jsonTreeViewer')).toBeVisible();
      expect(container.textContent).toContain('bytes');
      expect(container.textContent).toContain('100');
      expect(container.textContent).not.toContain('extension');
    });

    it('renders the whole document when no columns are selected', () => {
      const { container } = renderCell(hitWithFields);

      expect(container.textContent).toContain('bytes');
      expect(container.textContent).toContain('extension');
    });
  });

  it('does not warn for a document within the limit', () => {
    renderCell({ _id: '1', _index: 'test', _source: undefined, fields: { message: ['hello'] } });

    expect(screen.queryByTestId('sourceDocumentTruncatedWarning')).not.toBeInTheDocument();
    expect(screen.getByTestId('jsonTreeViewer')).toBeVisible();
  });

  it('hides null fields when the hideNulls setting is enabled', () => {
    const hit: EsHitRecord = { _id: '1', _index: 'test', _source: { present: 'x', empty: null } };
    const { container } = renderCell(hit, { jsonModeSettings: { hideNulls: true } });

    expect(container.textContent).toContain('present');
    expect(container.textContent).not.toContain('empty');
  });

  describe('filter for / filter out leaf actions', () => {
    it('renders filter buttons on a filterable leaf and calls onFilter with the field, value and mode', async () => {
      const onFilter = jest.fn();
      renderCell({ _id: '1', _index: 'test', _source: { bytes: 100 } }, { onFilter });

      await userEvent.click(screen.getByTestId(filterForTestId('bytes')));
      expect(onFilter).toHaveBeenCalledWith(dataViewMock.fields.getByName('bytes'), 100, '+');

      await userEvent.click(screen.getByTestId(filterOutTestId('bytes')));
      expect(onFilter).toHaveBeenCalledWith(dataViewMock.fields.getByName('bytes'), 100, '-');
    });

    it('does not render filter buttons for a non-filterable field', () => {
      // `message` is not searchable in the mock data view, so it is not filterable.
      renderCell(
        { _id: '1', _index: 'test', _source: { message: 'hello' } },
        { onFilter: jest.fn() }
      );

      expect(screen.getByTestId('jsonTreeViewer')).toBeVisible();
      expect(screen.queryByTestId(filterForTestId('message'))).not.toBeInTheDocument();
      expect(screen.queryByTestId(filterOutTestId('message'))).not.toBeInTheDocument();
    });

    it('does not render filter buttons for a field that is absent from the data view', () => {
      renderCell(
        { _id: '1', _index: 'test', _source: { unknownField: 'x' } },
        { onFilter: jest.fn() }
      );

      expect(screen.queryByTestId(filterForTestId('unknownField'))).not.toBeInTheDocument();
    });

    it('does not render filter buttons when no onFilter is provided', () => {
      renderCell({ _id: '1', _index: 'test', _source: { bytes: 100 } });

      expect(screen.getByTestId('jsonTreeViewer')).toBeVisible();
      expect(screen.queryByTestId(filterForTestId('bytes'))).not.toBeInTheDocument();
    });

    it('filters on the exact clicked element of a multi-value field', async () => {
      const onFilter = jest.fn();
      renderCell({ _id: '1', _index: 'test', _source: { bytes: [100, 200] } }, { onFilter });

      await userEvent.click(screen.getByTestId(rowTestId('bytes')));

      await userEvent.click(screen.getByTestId(filterForTestId('bytes.1')));
      expect(onFilter).toHaveBeenCalledWith(dataViewMock.fields.getByName('bytes'), 200, '+');
    });

    it('wraps a multi-value element as an array in ES|QL so the query builder can use MV_CONTAINS', async () => {
      const onFilter = jest.fn();
      renderCell(
        { _id: '1', _index: 'test', _source: { bytes: [100, 200] } },
        { onFilter, isPlainRecord: true }
      );

      await userEvent.click(screen.getByTestId(rowTestId('bytes')));

      await userEvent.click(screen.getByTestId(filterForTestId('bytes.1')));
      expect(onFilter).toHaveBeenCalledWith(dataViewMock.fields.getByName('bytes'), [200], '+');
    });

    it('renders filter buttons for an ES|QL computed column resolved from column meta', async () => {
      const onFilter: jest.MockedFunction<DocViewFilterFn> = jest.fn();
      renderCell(
        { _id: '1', _index: 'test', _source: { computedField: 42 } },
        { onFilter, columnsMeta: { computedField: { type: 'number' } } }
      );

      expect(screen.getByTestId(filterForTestId('computedField'))).toBeInTheDocument();

      await userEvent.click(screen.getByTestId(filterForTestId('computedField')));
      const [, value, mode] = onFilter.mock.calls[0];
      expect(value).toBe(42);
      expect(mode).toBe('+');
    });

    it('suppresses filter buttons on a computed column when hideFilteringOnComputedColumns is set', () => {
      renderCell(
        { _id: '1', _index: 'test', _source: { computedField: 42 } },
        {
          onFilter: jest.fn(),
          columnsMeta: { computedField: { type: 'number' } },
          hideFilteringOnComputedColumns: true,
        }
      );

      expect(screen.getByTestId('jsonTreeViewer')).toBeVisible();
      expect(screen.queryByTestId(filterForTestId('computedField'))).not.toBeInTheDocument();
    });
  });

  describe('in-table search counting pass', () => {
    it('renders the document content as cheap text instead of the tree while counting', () => {
      const { container } = renderCell(hitWithFields, {
        shouldShowFieldHandler: (fieldName) => ['extension', 'bytes'].includes(fieldName),
        inTableSearch: { term: 'gz', isCounting: true },
      });

      // No interactive tree is mounted for the offscreen counting pass...
      expect(screen.queryByTestId('jsonTreeViewer')).toBeNull();
      // ...but the document's searchable content is present for the wrapper to count over.
      expect(container.textContent).toContain('bytes');
      expect(container.textContent).toContain('100');
    });

    it('renders the interactive tree for visible cells (not counting)', () => {
      renderCell(hitWithFields, {
        shouldShowFieldHandler: (fieldName) => ['extension', 'bytes'].includes(fieldName),
        inTableSearch: { term: 'gz', isCounting: false },
      });

      expect(screen.getByTestId('jsonTreeViewer')).toBeVisible();
    });
  });
});
