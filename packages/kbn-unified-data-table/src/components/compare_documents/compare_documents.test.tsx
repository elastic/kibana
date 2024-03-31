/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { EuiDataGridProps } from '@elastic/eui';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { generateEsHits } from '@kbn/discover-utils/src/__mocks__';
import { render } from '@testing-library/react';
import { omit } from 'lodash';
import React from 'react';
import { dataViewWithTimefieldMock } from '../../../__mocks__/data_view_with_timefield';
import CompareDocuments from './compare_documents';
import { useComparisonFields } from './hooks/use_comparison_fields';

let mockLocalStorage: Record<string, string> = {};

jest.mock('react-use/lib/useLocalStorage', () =>
  jest.fn((key: string, value: unknown) => {
    mockLocalStorage[key] = JSON.stringify(value);
    return [value, jest.fn()];
  })
);

let mockDataGridProps: EuiDataGridProps | undefined;

jest.mock('@elastic/eui', () => ({
  ...jest.requireActual('@elastic/eui'),
  EuiDataGrid: jest.fn((props) => {
    mockDataGridProps = props;
    return <></>;
  }),
}));

jest.mock('./hooks/use_comparison_fields', () => {
  const originalModule = jest.requireActual('./hooks/use_comparison_fields');
  return {
    ...originalModule,
    useComparisonFields: jest.fn(originalModule.useComparisonFields),
  };
});

const docs = generateEsHits(dataViewWithTimefieldMock, 5).map((hit) =>
  buildDataTableRecord(hit, dataViewWithTimefieldMock)
);

const getDocById = (id: string) => docs.find((doc) => doc.raw._id === id);

const renderCompareDocuments = ({
  forceShowAllFields = false,
}: { forceShowAllFields?: boolean } = {}) => {
  const setSelectedDocs = jest.fn();
  render(
    <CompareDocuments
      id="test"
      wrapper={document.body}
      consumer="test"
      ariaDescribedBy="test"
      ariaLabelledBy="test"
      dataView={dataViewWithTimefieldMock}
      isPlainRecord={false}
      selectedFieldNames={['message', 'extension', 'bytes']}
      selectedDocs={['0', '1', '2']}
      schemaDetectors={[]}
      forceShowAllFields={forceShowAllFields}
      showFullScreenButton={true}
      fieldFormats={{} as any}
      getDocById={getDocById}
      setSelectedDocs={setSelectedDocs}
      setIsCompareActive={jest.fn()}
      renderCustomToolbar={jest.fn()}
    />
  );
  return { setSelectedDocs };
};

describe('CompareDocuments', () => {
  beforeEach(() => {
    mockLocalStorage = {};
    mockDataGridProps = undefined;
  });

  it('should pass expected grid props', () => {
    renderCompareDocuments();
    expect(mockDataGridProps).toBeDefined();
    expect(mockDataGridProps?.columns).toBeDefined();
    expect(mockDataGridProps?.css).toBeDefined();
    expect(omit(mockDataGridProps, 'columns', 'css')).toMatchInlineSnapshot(`
      Object {
        "aria-describedby": "test",
        "aria-labelledby": "test",
        "columnVisibility": Object {
          "setVisibleColumns": [Function],
          "visibleColumns": Array [
            "fields_generated-id",
            "0",
            "1",
            "2",
          ],
        },
        "data-test-subj": "unifiedDataTableCompareDocuments",
        "gridStyle": Object {
          "border": "horizontal",
          "cellPadding": "l",
          "fontSize": "s",
          "header": "underline",
          "rowHover": "highlight",
          "stripes": undefined,
        },
        "id": "test",
        "inMemory": Object {
          "level": "sorting",
        },
        "renderCellValue": [Function],
        "renderCustomToolbar": [Function],
        "rowCount": 3,
        "rowHeightsOptions": Object {
          "defaultHeight": "auto",
        },
        "schemaDetectors": Array [],
        "toolbarVisibility": Object {
          "showColumnSelector": false,
          "showDisplaySelector": false,
          "showFullScreenSelector": true,
        },
      }
    `);
  });

  it('should get values from local storage', () => {
    renderCompareDocuments();
    expect(mockLocalStorage).toEqual({
      'test:dataGridDiffMode': '"basic"',
      'test:dataGridShowAllFields': 'false',
      'test:dataGridShowDiffDecorations': 'true',
      'test:dataGridShowMatchingValues': 'true',
    });
  });

  it('should set selected docs when columns change', () => {
    const { setSelectedDocs } = renderCompareDocuments();
    const visibleColumns = ['fields_generated-id', '0', '1', '2'];
    mockDataGridProps?.columnVisibility.setVisibleColumns(visibleColumns);
    expect(setSelectedDocs).toHaveBeenCalledWith(visibleColumns.slice(1));
  });

  it('should force show all fields when prop is true', () => {
    renderCompareDocuments();
    expect(useComparisonFields).toHaveBeenLastCalledWith(
      expect.objectContaining({ showAllFields: false })
    );
    renderCompareDocuments({ forceShowAllFields: true });
    expect(useComparisonFields).toHaveBeenLastCalledWith(
      expect.objectContaining({ showAllFields: true })
    );
  });
});
