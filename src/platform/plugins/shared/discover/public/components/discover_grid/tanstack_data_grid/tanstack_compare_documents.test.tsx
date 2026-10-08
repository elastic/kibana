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
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { TanStackCompareDocuments } from './tanstack_compare_documents';

jest.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({ index, start: index * 48 })),
    getTotalSize: () => count * 48,
    measureElement: () => {},
  }),
}));

const docs = [
  buildDataTableRecord({ _id: 'first', _index: 'test', _source: { bytes: 100 } }, dataViewMock),
  buildDataTableRecord({ _id: 'second', _index: 'test', _source: { bytes: 200 } }, dataViewMock),
];

const docMap = new Map(docs.map((doc, docIndex) => [doc.id, { doc, docIndex }]));

it('renders selected documents with TanStack and can change the comparison base', async () => {
  const replaceSelectedDocs = jest.fn();
  renderWithI18n(
    <TanStackCompareDocuments
      consumer="discover"
      ariaLabelledBy="documentsAriaLabel"
      dataView={dataViewMock}
      isPlainRecord={false}
      selectedFieldNames={['bytes']}
      selectedDocIds={docs.map(({ id }) => id)}
      forceShowAllFields={false}
      showFullScreenButton={false}
      fieldFormats={fieldFormatsServiceMock.createStartContract()}
      docMap={docMap}
      replaceSelectedDocs={replaceSelectedDocs}
      setIsCompareActive={jest.fn()}
      isFullScreen={false}
      onToggleFullScreen={jest.fn()}
    />
  );

  expect(screen.getByRole('table')).toBeInTheDocument();
  expect(screen.getByTestId('unifiedDataTableComparisonFieldName')).toHaveTextContent('bytes');
  expect(screen.getAllByRole('cell')).toHaveLength(3);

  await userEvent.click(screen.getByTestId('unifiedDataTableComparisonSettings'));
  await userEvent.click(screen.getByTestId('unifiedDataTableDiffMode-chars'));
  expect(screen.getAllByRole('cell')[2]).toHaveTextContent('1200');

  await userEvent.click(screen.getByRole('button', { name: 'Pin for comparison' }));
  expect(replaceSelectedDocs).toHaveBeenCalledWith([docs[1].id, docs[0].id]);
});
