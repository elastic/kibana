/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EuiDataGridProps, EuiDataGridRefProps } from '@elastic/eui';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { generateEsHits } from '@kbn/discover-utils/src/__mocks__';
import { act, render } from '@testing-library/react';
import { omit } from 'lodash';
import React from 'react';
import { dataViewWithTimefieldMock } from '../../../__mocks__/data_view_with_timefield';
import type { CompareDocumentsProps } from './compare_documents';
import CompareDocuments from './compare_documents';
import { useComparisonFields } from './hooks/use_comparison_fields';

let mockLocalStorage: Record<string, string> = {};

jest.mock('../../restorable_state', () => {
  const real = jest.requireActual('../../restorable_state');
  return {
    useRestorableLocalStorage: jest.fn((key: string, storageKey, value: unknown) => {
      mockLocalStorage[storageKey] = JSON.stringify(value);
      return real.useRestorableLocalStorage(key, storageKey, value);
    }),
  };
});

let mockDataGridProps: EuiDataGridProps | undefined;
let mockDataGridRef: unknown;

jest.mock('@elastic/eui', () => {
  const { forwardRef } = jest.requireActual('react');
  return {
    ...jest.requireActual('@elastic/eui'),
    EuiDataGrid: forwardRef((props: EuiDataGridProps, ref: unknown) => {
      mockDataGridProps = props;
      mockDataGridRef = ref;
      return <></>;
    }),
  };
});

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

const createDocMap = (currentDocs = docs) =>
  new Map(currentDocs.map((doc, docIndex) => [doc.raw._id ?? doc.id, { doc, docIndex }]));

const renderCompareDocuments = ({
  forceShowAllFields = false,
  ref,
}: { forceShowAllFields?: boolean; ref?: React.Ref<EuiDataGridRefProps> } = {}) => {
  const replaceSelectedDocs = jest.fn();
  const getCompareDocuments = (props?: Partial<CompareDocumentsProps>) => (
    <CompareDocuments
      ref={ref}
      id="test"
      wrapper={document.body}
      consumer="test"
      ariaDescribedBy="test"
      ariaLabelledBy="test"
      dataView={dataViewWithTimefieldMock}
      selectedFieldNames={['message', 'extension', 'bytes']}
      selectedDocIds={['0', '1', '2']}
      schemaDetectors={[]}
      forceShowAllFields={forceShowAllFields}
      showFullScreenButton={true}
      fieldFormats={{} as any}
      docMap={createDocMap()}
      replaceSelectedDocs={replaceSelectedDocs}
      setIsCompareActive={jest.fn()}
      {...props}
    />
  );
  const { rerender } = render(getCompareDocuments());
  return {
    replaceSelectedDocs,
    rerender: (props?: Partial<CompareDocumentsProps>) => rerender(getCompareDocuments(props)),
  };
};

describe('CompareDocuments', () => {
  beforeEach(() => {
    mockLocalStorage = {};
    mockDataGridProps = undefined;
    mockDataGridRef = undefined;
  });

  it('should pass expected grid props', () => {
    renderCompareDocuments();
    expect(mockDataGridProps).toBeDefined();
    expect(mockDataGridProps?.columns).toBeDefined();
    expect(omit(mockDataGridProps, 'columns')).toMatchInlineSnapshot(`
      Object {
        "aria-describedby": "test",
        "aria-labelledby": "test",
        "className": "css-q5zi8p-indicatorCss",
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
        "onFullScreenChange": undefined,
        "renderCellValue": [Function],
        "renderCustomGridBody": undefined,
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

  it('should forward the ref, custom grid body and full screen callback to the grid', () => {
    const ref = React.createRef<EuiDataGridRefProps>();
    const renderCustomGridBody = jest.fn();
    const onFullScreenChange = jest.fn();
    const { rerender } = renderCompareDocuments({ ref });
    rerender({ renderCustomGridBody, onFullScreenChange });

    expect(mockDataGridRef).toBe(ref);
    expect(mockDataGridProps?.renderCustomGridBody).toBe(renderCustomGridBody);
    expect(mockDataGridProps?.onFullScreenChange).toBe(onFullScreenChange);
  });

  it('should let a custom toolbar renderer decorate the comparison toolbar', () => {
    const renderCustomToolbar = jest.fn(({ toolbar }) => (
      <div data-test-subj="decorated">{toolbar}</div>
    ));
    const { rerender } = renderCompareDocuments();
    rerender({ renderCustomToolbar });
    const toolbarProps = {
      hasRoomForGridControls: true,
      columnControl: null,
      columnSortingControl: null,
      keyboardShortcutsControl: null,
      displayControl: null,
      fullScreenControl: null,
    };

    const decorated = mockDataGridProps?.renderCustomToolbar?.(toolbarProps);

    expect(renderCustomToolbar).toHaveBeenCalledWith({
      toolbar: expect.anything(),
      toolbarProps,
    });
    expect(decorated).toEqual(
      expect.objectContaining({ props: expect.objectContaining({ 'data-test-subj': 'decorated' }) })
    );
  });

  it('should get values from local storage', () => {
    renderCompareDocuments();
    expect(mockLocalStorage).toEqual({
      'test:dataGridComparisonDiffMode': '"basic"',
      'test:dataGridComparisonShowAllFields': 'false',
      'test:dataGridComparisonShowDiff': 'true',
      'test:dataGridComparisonShowDiffDecorations': 'true',
      'test:dataGridComparisonShowMatchingValues': 'true',
    });
  });

  it('should set selected docs when columns change', () => {
    const { replaceSelectedDocs } = renderCompareDocuments();
    const visibleColumns = ['fields_generated-id', '0', '1', '2'];
    act(() => {
      mockDataGridProps?.columnVisibility.setVisibleColumns(visibleColumns);
    });
    expect(replaceSelectedDocs).toHaveBeenCalledWith(visibleColumns.slice(1));
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

  it('should retain comparison docs when docMap and selectedDocIds lose access to them', () => {
    const { rerender } = renderCompareDocuments();
    const visibleColumns = ['fields_generated-id', '0', '1', '2'];
    expect(mockDataGridProps?.columnVisibility.visibleColumns).toEqual(visibleColumns);
    rerender({ docMap: new Map(), selectedDocIds: [] });
    expect(mockDataGridProps?.columnVisibility.visibleColumns).toEqual(visibleColumns);
  });
});
