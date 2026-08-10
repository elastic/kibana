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
import { SourceDocumentJsonMode } from './source_document_json_mode';
import { MAX_TREE_VALUES } from '../utils/build_document_tree';

const fieldFormats = fieldFormatsServiceMock.createStartContract();

const renderCell = (hit: EsHitRecord) =>
  renderWithI18n(
    <SourceDocumentJsonMode
      row={buildDataTableRecord(hit, dataViewMock)}
      dataView={dataViewMock}
      columnsMeta={undefined}
      shouldShowFieldHandler={() => true}
      fieldFormats={fieldFormats}
    />
  );

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

  it('does not warn for a document within the limit', () => {
    renderCell({ _id: '1', _index: 'test', _source: undefined, fields: { message: ['hello'] } });

    expect(screen.queryByTestId('sourceDocumentTruncatedWarning')).not.toBeInTheDocument();
    expect(screen.getByTestId('jsonTreeViewer')).toBeVisible();
  });
});
