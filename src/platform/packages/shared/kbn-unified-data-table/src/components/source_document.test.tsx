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
      `"<dl class=\\"euiDescriptionList unifiedDataTable__descriptionList unifiedDataTable__cellValue css-id58dh-euiDescriptionList-inline-left\\" data-test-subj=\\"discoverCellDescriptionList\\" data-type=\\"inline\\"><dt class=\\"euiDescriptionList__title unifiedDataTable__descriptionListTitle css-4yy33l-euiDescriptionList__title-inline-compressed\\">extension</dt><dd class=\\"euiDescriptionList__description unifiedDataTable__descriptionListDescription css-11rdew2-euiDescriptionList__description-inline-compressed\\">.gz</dd><dt class=\\"euiDescriptionList__title unifiedDataTable__descriptionListTitle css-4yy33l-euiDescriptionList__title-inline-compressed\\">_index</dt><dd class=\\"euiDescriptionList__description unifiedDataTable__descriptionListDescription css-11rdew2-euiDescriptionList__description-inline-compressed\\">test</dd><dt class=\\"euiDescriptionList__title unifiedDataTable__descriptionListTitle css-4yy33l-euiDescriptionList__title-inline-compressed\\">_score</dt><dd class=\\"euiDescriptionList__description unifiedDataTable__descriptionListDescription css-11rdew2-euiDescriptionList__description-inline-compressed\\">1</dd></dl>"`
    );
  });
});
