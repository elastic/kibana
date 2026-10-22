/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { generateEsHits } from '@kbn/discover-utils/src/__mocks__';
import { dataViewWithTimefieldMock } from '../../../__mocks__/data_view_with_timefield';
import { servicesMock } from '../../../__mocks__/services';
import CompareDocuments from './compare_documents';

const docs = generateEsHits(dataViewWithTimefieldMock, 5).map((hit) =>
  buildDataTableRecord(hit, dataViewWithTimefieldMock)
);

describe('CompareDocuments with @kbn/data-grid', () => {
  beforeAll(() => {
    jest.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(600);
    jest.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(1200);
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  it('keeps the field names and the pinned document in view', () => {
    const docMap = new Map(docs.map((doc, docIndex) => [doc.raw._id ?? doc.id, { doc, docIndex }]));
    const selectedDocIds = docs.slice(0, 4).map((doc) => doc.raw._id ?? doc.id);
    render(
      <IntlProvider locale="en">
        <EuiThemeProvider>
          <CompareDocuments
            id="test"
            wrapper={document.body}
            consumer="test"
            ariaDescribedBy="test"
            ariaLabelledBy="test"
            dataView={dataViewWithTimefieldMock}
            selectedFieldNames={['message', 'extension']}
            selectedDocIds={selectedDocIds}
            schemaDetectors={[]}
            forceShowAllFields={false}
            showFullScreenButton={true}
            fieldFormats={servicesMock.fieldFormats}
            docMap={docMap}
            replaceSelectedDocs={jest.fn()}
            setIsCompareActive={jest.fn()}
            isKbnDataGridEnabled
          />
        </EuiThemeProvider>
      </IntlProvider>
    );

    const [fieldHeader, pinnedHeader, comparedHeader] = screen.getAllByRole('columnheader');
    // The field names, then the document the others are compared with, stay while the rest scrolls.
    expect(fieldHeader.style.left).toBe('0px');
    expect(pinnedHeader.style.left).toBe('200px');
    expect(comparedHeader.style.left).toBe('');
    expect(screen.getByTestId('unifiedDataTableCompareDocuments')).toBeInTheDocument();
  });
});
