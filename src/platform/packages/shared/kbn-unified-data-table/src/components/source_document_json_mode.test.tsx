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
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import type { EsHitRecord } from '@kbn/discover-utils/types';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { InTableSearchCellContext } from '@kbn/data-grid-in-table-search';
import { SourceDocumentJsonMode } from './source_document_json_mode';
import type { JsonModeSettings } from '../types';
import { MAX_TREE_VALUES } from '../utils/build_document_tree';

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
  }: {
    shouldShowFieldHandler?: (fieldName: string) => boolean;
    inTableSearch?: { term: string; isCounting: boolean };
    jsonModeSettings?: JsonModeSettings;
    selectedColumns?: string[];
  } = {}
) => {
  const cell = (
    <SourceDocumentJsonMode
      row={buildDataTableRecord(hit, dataViewMock)}
      dataView={dataViewMock}
      columnsMeta={undefined}
      shouldShowFieldHandler={shouldShowFieldHandler}
      fieldFormats={fieldFormats}
      jsonModeSettings={jsonModeSettings}
      selectedColumns={selectedColumns}
    />
  );

  return renderWithI18n(
    inTableSearch ? (
      <InTableSearchCellContext.Provider
        value={{ inTableSearchTerm: inTableSearch.term, isCounting: inTableSearch.isCounting }}
      >
        {cell}
      </InTableSearchCellContext.Provider>
    ) : (
      cell
    )
  );
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
