/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { FieldFormatsStart } from '@kbn/field-formats-plugin/public';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import React from 'react';
import SourceDocument from './source_document';
import type { EsHitRecord } from '@kbn/discover-utils/src/types';
import { buildDataTableRecord } from '@kbn/discover-utils';

const mockServices = {
  fieldFormats: {
    getDefaultInstance: jest.fn(() => ({ convert: (value: unknown) => (value ? value : '-') })),
  },
};

const rowsSource: EsHitRecord[] = [
  {
    _id: '1',
    _index: 'test',
    _score: 1,
    _source: { bytes: 100, extension: '.gz' },
    highlight: {
      extension: ['@kibana-highlighted-field.gz@/kibana-highlighted-field'],
    },
  },
];

const build = (hit: EsHitRecord) => buildDataTableRecord(hit, dataViewMock);

describe('Unified data table source document cell rendering', function () {
  it('renders a description list for source type documents', () => {
    const rows = rowsSource.map(build);

    const component = mountWithIntl(
      <SourceDocument
        useTopLevelObjectColumns={false}
        row={rows[0]}
        dataView={dataViewMock}
        columnId="_source"
        fieldFormats={mockServices.fieldFormats as unknown as FieldFormatsStart}
        shouldShowFieldHandler={() => false}
        maxEntries={100}
        isPlainRecord={true}
      />
    );
    expect(component.html()).toMatchInlineSnapshot(
      `"<dl class=\\"unifiedDataTable__cellValue unifiedDataTable__descriptionList--compressed\\" data-test-subj=\\"discoverCellDescriptionList\\" css=\\"You have tried to stringify object returned from \`css\` function. It isn't supposed to be used directly (e.g. as value of the \`className\` prop), but rather handed to emotion so it can handle it (e.g. as value of \`css\` prop).\\"><dt css=\\"You have tried to stringify object returned from \`css\` function. It isn't supposed to be used directly (e.g. as value of the \`className\` prop), but rather handed to emotion so it can handle it (e.g. as value of \`css\` prop).\\">extension</dt><dd css=\\"You have tried to stringify object returned from \`css\` function. It isn't supposed to be used directly (e.g. as value of the \`className\` prop), but rather handed to emotion so it can handle it (e.g. as value of \`css\` prop).\\">.gz</dd><dt css=\\"You have tried to stringify object returned from \`css\` function. It isn't supposed to be used directly (e.g. as value of the \`className\` prop), but rather handed to emotion so it can handle it (e.g. as value of \`css\` prop).\\">_index</dt><dd css=\\"You have tried to stringify object returned from \`css\` function. It isn't supposed to be used directly (e.g. as value of the \`className\` prop), but rather handed to emotion so it can handle it (e.g. as value of \`css\` prop).\\">test</dd><dt css=\\"You have tried to stringify object returned from \`css\` function. It isn't supposed to be used directly (e.g. as value of the \`className\` prop), but rather handed to emotion so it can handle it (e.g. as value of \`css\` prop).\\">_score</dt><dd css=\\"You have tried to stringify object returned from \`css\` function. It isn't supposed to be used directly (e.g. as value of the \`className\` prop), but rather handed to emotion so it can handle it (e.g. as value of \`css\` prop).\\">1</dd></dl>"`
    );
  });
});
