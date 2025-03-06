/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useState } from 'react';
import { ReactWrapper } from 'enzyme';
import {
  BUTTON_NEXT_TEST_SUBJ,
  BUTTON_TEST_SUBJ,
  COUNTER_TEST_SUBJ,
  HIGHLIGHT_CLASS_NAME,
  INPUT_TEST_SUBJ,
} from '@kbn/data-grid-in-table-search';
import {
  EuiButton,
  EuiDataGrid,
  EuiDataGridCellValueElementProps,
  EuiDataGridCustomBodyProps,
} from '@elastic/eui';
import { waitForEuiPopoverOpen } from '@elastic/eui/lib/test/rtl';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { act } from 'react-dom/test-utils';
import { findTestSubject } from '@elastic/eui/lib/test';
import {
  buildDataViewMock,
  deepMockedFields,
  esHitsMock,
  generateEsHits,
} from '@kbn/discover-utils/src/__mocks__';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { DataLoadingState, UnifiedDataTable, UnifiedDataTableProps } from './data_table';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { servicesMock } from '../../__mocks__/services';
import { buildDataTableRecord, getDocId } from '@kbn/discover-utils';
import type { DataTableRecord, EsHitRecord } from '@kbn/discover-utils/types';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import {
  mockRowAdditionalLeadingControls,
  testLeadingControlColumn,
  testTrailingControlColumns,
} from '../../__mocks__/external_control_columns';
import { DatatableColumnType } from '@kbn/expressions-plugin/common';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CELL_CLASS } from '../utils/get_render_cell_value';
import { defaultTimeColumnWidth } from '../constants';
import { useColumns } from '../hooks/use_data_grid_columns';
import { capabilitiesServiceMock } from '@kbn/core-capabilities-browser-mocks';
import { dataViewsMock } from '../../__mocks__/data_views';

const mockUseDataGridColumnsCellActions = jest.fn((prop: unknown) => []);
jest.mock('@kbn/cell-actions', () => ({
  ...jest.requireActual('@kbn/cell-actions'),
  useDataGridColumnsCellActions: (prop: unknown) => mockUseDataGridColumnsCellActions(prop),
}));

const EXTENDED_JEST_TIMEOUT = 10000;

const dataViewMock = buildDataViewMock({
  name: 'the-data-view',
  fields: deepMockedFields,
  timeFieldName: '@timestamp',
});

function getProps(): UnifiedDataTableProps {
  const services = servicesMock;
  services.dataViewFieldEditor.userPermissions.editIndexPattern = jest.fn().mockReturnValue(true);

  return {
    ariaLabelledBy: '',
    columns: [],
    dataView: dataViewMock,
    loadingState: DataLoadingState.loaded,
    expandedDoc: undefined,
    onFilter: jest.fn(),
    onResize: jest.fn(),
    onSetColumns: jest.fn(),
    onSort: jest.fn(),
    rows: esHitsMock.map((hit) => buildDataTableRecord(hit, dataViewMock)),
    sampleSizeState: 30,
    searchDescription: '',
    searchTitle: '',
    setExpandedDoc: jest.fn(),
    settings: {},
    showTimeCol: true,
    sort: [],
    services: {
      fieldFormats: services.fieldFormats,
      uiSettings: services.uiSettings,
      dataViewFieldEditor: services.dataViewFieldEditor,
      toastNotifications: services.toastNotifications,
      storage: services.storage as unknown as Storage,
      data: services.data,
      theme: services.theme,
    },
    cellActionsMetadata: {
      someKey: 'someValue',
    },
  };
}

const DataTable = (props: Partial<UnifiedDataTableProps>) => (
  <KibanaContextProvider services={servicesMock}>
    <UnifiedDataTable {...getProps()} {...props} />
  </KibanaContextProvider>
);

const capabilities = capabilitiesServiceMock.createStartContract().capabilities;

const renderDataTable = async (props: Partial<UnifiedDataTableProps>) => {
  const DataTableWrapped = () => {
    const [columns, setColumns] = useState(props.columns ?? []);
    const [settings, setSettings] = useState(props.settings);
    const [sort, setSort] = useState(props.sort ?? []);

    const { onSetColumns } = useColumns({
      capabilities,
      dataView: dataViewMock,
      dataViews: dataViewsMock,
      setAppState: useCallback((state) => {
        if (state.columns) {
          setColumns(state.columns);
        }
        if (state.settings) {
          setSettings(state.settings);
        }
      }, []),
      columns,
      settings,
    });

    return (
      <IntlProvider locale="en">
        <DataTable
          {...props}
          columns={columns}
          onSetColumns={onSetColumns}
          settings={settings}
          onResize={({ columnId, width }) => {
            setSettings({
              ...settings,
              columns: {
                ...settings?.columns,
                [columnId]: {
                  width,
                },
              },
            });
          }}
          sort={sort}
          onSort={setSort as UnifiedDataTableProps['onSort']}
        />
      </IntlProvider>
    );
  };

  render(<DataTableWrapped />);

  // EuiDataGrid makes state updates after calling requestAnimationFrame, which can lead
  // to "Can't perform a React state update on an unmounted component." warnings in tests,
  // so we need to wait for the next animation frame to avoid this
  await screen.findByTestId('discoverDocTable');
  await act(() => new Promise((resolve) => requestAnimationFrame(() => resolve(void 0))));
};

async function getComponent(props: UnifiedDataTableProps = getProps()) {
  const component = mountWithIntl(<DataTable {...props} />);
  await act(async () => {
    // needed by cell actions to complete async loading and avoid act warning
    component.update();
  });
  return component;
}

function getSelectedDocNr(component: ReactWrapper<UnifiedDataTableProps>) {
  const gridSelectionBtn = findTestSubject(component, 'unifiedDataTableSelectionBtn');
  if (!gridSelectionBtn.length) {
    return 0;
  }
  const selectedNr = gridSelectionBtn.getDOMNode().getAttribute('data-selected-documents');
  return Number(selectedNr);
}

function getDisplayedDocNr(component: ReactWrapper<UnifiedDataTableProps>) {
  const gridSelectionBtn = findTestSubject(component, 'discoverDocTable');
  if (!gridSelectionBtn.length) {
    return 0;
  }
  const selectedNr = gridSelectionBtn.getDOMNode().getAttribute('data-document-number');
  return Number(selectedNr);
}

async function toggleDocSelection(
  component: ReactWrapper<UnifiedDataTableProps>,
  document: EsHitRecord
) {
  act(() => {
    const docId = getDocId(document);
    findTestSubject(component, `dscGridSelectDoc-${docId}`).simulate('change');
  });
  component.update();
}

describe('UnifiedDataTable', () => {
  const originalClipboard = global.window.navigator.clipboard;

  beforeAll(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: {
        writeText: jest.fn(),
      },
      writable: true,
    });
  });

  afterAll(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: originalClipboard,
    });
  });

  afterEach(async () => {
    jest.clearAllMocks();
  });

  describe('Document selection', () => {
    let component: ReactWrapper<UnifiedDataTableProps>;
    beforeEach(async () => {
      component = await getComponent();
    });

    test(
      'no documents are selected initially',
      async () => {
        expect(getSelectedDocNr(component)).toBe(0);
        expect(getDisplayedDocNr(component)).toBe(5);
      },
      EXTENDED_JEST_TIMEOUT
    );

    test(
      'Allows selection/deselection of multiple documents',
      async () => {
        await toggleDocSelection(component, esHitsMock[0]);
        expect(getSelectedDocNr(component)).toBe(1);
        await toggleDocSelection(component, esHitsMock[1]);
        expect(getSelectedDocNr(component)).toBe(2);
        await toggleDocSelection(component, esHitsMock[1]);
        expect(getSelectedDocNr(component)).toBe(1);
      },
      EXTENDED_JEST_TIMEOUT
    );

    test(
      'deselection of all selected documents',
      async () => {
        await toggleDocSelection(component, esHitsMock[0]);
        await toggleDocSelection(component, esHitsMock[1]);
        expect(getSelectedDocNr(component)).toBe(2);
        findTestSubject(component, 'unifiedDataTableSelectionBtn').simulate('click');
        findTestSubject(component, 'dscGridClearSelectedDocuments').simulate('click');
        expect(getSelectedDocNr(component)).toBe(0);
      },
      EXTENDED_JEST_TIMEOUT
    );

    test(
      'showing only selected documents and undo selection',
      async () => {
        await toggleDocSelection(component, esHitsMock[0]);
        await toggleDocSelection(component, esHitsMock[1]);
        expect(getSelectedDocNr(component)).toBe(2);
        findTestSubject(component, 'unifiedDataTableSelectionBtn').simulate('click');
        findTestSubject(component, 'dscGridShowSelectedDocuments').simulate('click');
        expect(getDisplayedDocNr(component)).toBe(2);
        findTestSubject(component, 'unifiedDataTableSelectionBtn').simulate('click');
        component.update();
        findTestSubject(component, 'dscGridShowAllDocuments').simulate('click');
        expect(getDisplayedDocNr(component)).toBe(5);
      },
      EXTENDED_JEST_TIMEOUT
    );

    test(
      'showing selected documents, underlying data changes, all documents are displayed, selection is gone',
      async () => {
        await toggleDocSelection(component, esHitsMock[0]);
        await toggleDocSelection(component, esHitsMock[1]);
        expect(getSelectedDocNr(component)).toBe(2);
        findTestSubject(component, 'unifiedDataTableSelectionBtn').simulate('click');
        findTestSubject(component, 'dscGridShowSelectedDocuments').simulate('click');
        expect(getDisplayedDocNr(component)).toBe(2);
        component.setProps({
          rows: [
            {
              _index: 'i',
              _id: '6',
              _score: 1,
              _source: {
                date: '2020-20-02T12:12:12.128',
                name: 'test6',
                extension: 'doc',
                bytes: 50,
              },
            },
          ].map((row) => buildDataTableRecord(row, dataViewMock)),
        });
        expect(getDisplayedDocNr(component)).toBe(1);
        expect(getSelectedDocNr(component)).toBe(0);
      },
      EXTENDED_JEST_TIMEOUT
    );

    test(
      'showing only selected documents and remove filter deselecting each doc manually',
      async () => {
        await toggleDocSelection(component, esHitsMock[0]);
        findTestSubject(component, 'unifiedDataTableSelectionBtn').simulate('click');
        findTestSubject(component, 'dscGridShowSelectedDocuments').simulate('click');
        expect(getDisplayedDocNr(component)).toBe(1);
        await toggleDocSelection(component, esHitsMock[0]);
        expect(getDisplayedDocNr(component)).toBe(5);
        await toggleDocSelection(component, esHitsMock[0]);
        expect(getDisplayedDocNr(component)).toBe(5);
      },
      EXTENDED_JEST_TIMEOUT
    );

    test(
      'copying selected documents to clipboard as JSON',
      async () => {
        await toggleDocSelection(component, esHitsMock[0]);
        findTestSubject(component, 'unifiedDataTableSelectionBtn').simulate('click');
        findTestSubject(component, 'dscGridCopySelectedDocumentsJSON').simulate('click');
        // wait for async copy action to avoid act warning
        await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          '[{"_index":"i","_id":"1","_score":1,"_type":"_doc","_source":{"date":"2020-20-01T12:12:12.123","message":"test1","bytes":20}}]'
        );
      },
      EXTENDED_JEST_TIMEOUT
    );

    test(
      'copying selected documents to clipboard as text',
      async () => {
        await toggleDocSelection(component, esHitsMock[2]);
        await toggleDocSelection(component, esHitsMock[1]);
        findTestSubject(component, 'unifiedDataTableSelectionBtn').simulate('click');
        findTestSubject(component, 'unifiedDataTableCopyRowsAsText').simulate('click');
        // wait for async copy action to avoid act warning
        await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          '"\'@timestamp"\t"_index"\t"_score"\tbytes\tdate\textension\tmessage\tname\n-\ti\t1\t-\t"2020-20-01T12:12:12.124"\tjpg\t-\ttest2\n-\ti\t1\t50\t"2020-20-01T12:12:12.124"\tgif\t-\ttest3'
        );
      },
      EXTENDED_JEST_TIMEOUT
    );

    test(
      'copying selected columns to clipboard as text',
      async () => {
        component = await getComponent({
          ...getProps(),
          columns: ['date', 'extension', 'name'],
        });
        await toggleDocSelection(component, esHitsMock[2]);
        await toggleDocSelection(component, esHitsMock[1]);
        findTestSubject(component, 'unifiedDataTableSelectionBtn').simulate('click');
        findTestSubject(component, 'unifiedDataTableCopyRowsAsText').simulate('click');
        // wait for async copy action to avoid act warning
        await act(() => new Promise((resolve) => setTimeout(resolve, 0)));
        expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
          '"\'@timestamp"\tdate\textension\tname\n-\t"2020-20-01T12:12:12.124"\tjpg\ttest2\n-\t"2020-20-01T12:12:12.124"\tgif\ttest3'
        );
      },
      EXTENDED_JEST_TIMEOUT
    );
  });

  describe('edit field button', () => {
    it(
      'should render the edit field button if onFieldEdited is provided',
      async () => {
        await renderDataTable({ columns: ['message'], onFieldEdited: jest.fn() });
        expect(
          screen.queryByTestId('dataGridHeaderCellActionGroup-message')
        ).not.toBeInTheDocument();
        await userEvent.click(screen.getByTestId('dataGridHeaderCellActionButton-message'));
        expect(screen.getByTestId('dataGridHeaderCellActionGroup-message')).toBeInTheDocument();
        expect(screen.getByTestId('gridEditFieldButton')).toBeInTheDocument();
      },
      EXTENDED_JEST_TIMEOUT
    );

    it(
      'should not render the edit field button if onFieldEdited is not provided',
      async () => {
        await renderDataTable({ columns: ['message'] });
        expect(
          screen.queryByTestId('dataGridHeaderCellActionGroup-message')
        ).not.toBeInTheDocument();
        await userEvent.click(screen.getByTestId('dataGridHeaderCellActionButton-message'));
        expect(screen.getByTestId('dataGridHeaderCellActionGroup-message')).toBeInTheDocument();
        expect(screen.queryByTestId('gridEditFieldButton')).not.toBeInTheDocument();
      },
      EXTENDED_JEST_TIMEOUT
    );
  });

  describe('cellActionsTriggerId', () => {
    it(
      'should call useDataGridColumnsCellActions with empty params when no cellActionsTriggerId is provided',
      async () => {
        await getComponent({
          ...getProps(),
          columns: ['message'],
          onFieldEdited: jest.fn(),
        });
        expect(mockUseDataGridColumnsCellActions).toHaveBeenCalledWith({
          triggerId: undefined,
          getCellValue: expect.any(Function),
          fields: undefined,
          dataGridRef: expect.any(Object),
          metadata: {
            dataViewId: 'the-data-view-id',
            someKey: 'someValue',
          },
        });
      },
      EXTENDED_JEST_TIMEOUT
    );

    it(
      'should call useDataGridColumnsCellActions properly when cellActionsTriggerId defined',
      async () => {
        await getComponent({
          ...getProps(),
          columns: ['message'],
          onFieldEdited: jest.fn(),
          cellActionsTriggerId: 'test',
        });
        expect(mockUseDataGridColumnsCellActions).toHaveBeenCalledWith({
          triggerId: 'test',
          getCellValue: expect.any(Function),
          fields: [
            dataViewMock.getFieldByName('@timestamp')?.toSpec(),
            dataViewMock.getFieldByName('message')?.toSpec(),
          ],
          dataGridRef: expect.any(Object),
          metadata: {
            dataViewId: 'the-data-view-id',
            someKey: 'someValue',
          },
        });
      },
      EXTENDED_JEST_TIMEOUT
    );
  });

  describe('sorting', () => {
    const getColumnActions = (name: string) =>
      screen.getByTestId(`dataGridHeaderCellActionButton-${name}`);
    const getCellValuesByColumn = () => {
      const columns = screen
        .getAllByRole('columnheader')
        .map((header) => header.dataset.gridcellColumnId!);
      const values = screen
        .getAllByRole('gridcell')
        .map((cell) => cell.querySelector('.unifiedDataTable__cellValue')?.textContent ?? '');
      return values.reduce<Record<string, string[]>>((acc, value, i) => {
        const column = columns[i % columns.length];
        acc[column] = acc[column] ?? [];
        acc[column].push(value);
        return acc;
      }, {});
    };

    it(
      'should apply client side sorting in ES|QL mode',
      async () => {
        await renderDataTable({
          isPlainRecord: true,
          columns: ['message'],
          rows: generateEsHits(dataViewMock, 10).map((hit) =>
            buildDataTableRecord(hit, dataViewMock)
          ),
        });
        let values = getCellValuesByColumn();
        expect(values.message).toEqual([
          'message_0',
          'message_1',
          'message_2',
          'message_3',
          'message_4',
          'message_5',
          'message_6',
          'message_7',
          'message_8',
          'message_9',
        ]);
        await userEvent.click(getColumnActions('message'));
        await waitForEuiPopoverOpen();
        // Column sort button incorrectly renders as "Sort " instead
        // of "Sort Z-A" in Jest tests, so we need to find it by index
        await userEvent.click(screen.getAllByRole('button', { name: /Sort/ })[2]);
        await waitFor(() => {
          values = getCellValuesByColumn();
          expect(values.message).toEqual([
            'message_9',
            'message_8',
            'message_7',
            'message_6',
            'message_5',
            'message_4',
            'message_3',
            'message_2',
            'message_1',
            'message_0',
          ]);
        });
      },
      EXTENDED_JEST_TIMEOUT
    );

    it(
      'should not apply client side sorting if not in ES|QL mode',
      async () => {
        await renderDataTable({
          columns: ['message'],
          rows: generateEsHits(dataViewMock, 10).map((hit) =>
            buildDataTableRecord(hit, dataViewMock)
          ),
        });
        let values = getCellValuesByColumn();
        expect(values.message).toEqual([
          'message_0',
          'message_1',
          'message_2',
          'message_3',
          'message_4',
          'message_5',
          'message_6',
          'message_7',
          'message_8',
          'message_9',
        ]);
        await userEvent.click(getColumnActions('message'));
        await waitForEuiPopoverOpen();
        // Column sort button incorrectly renders as "Sort " instead
        // of "Sort Z-A" in Jest tests, so we need to find it by index
        await userEvent.click(screen.getAllByRole('button', { name: /Sort/ })[2]);
        await waitFor(() => {
          values = getCellValuesByColumn();
          expect(values.message).toEqual([
            'message_0',
            'message_1',
            'message_2',
            'message_3',
            'message_4',
            'message_5',
            'message_6',
            'message_7',
            'message_8',
            'message_9',
          ]);
        });
      },
      EXTENDED_JEST_TIMEOUT
    );

    it(
      'should apply sorting',
      async () => {
        const component = await getComponent({
          ...getProps(),
          sort: [['message', 'desc']],
          columns: ['message'],
        });

        expect(component.find(EuiDataGrid).last().prop('sorting')).toMatchInlineSnapshot(`
                  Object {
                    "columns": Array [
                      Object {
                        "direction": "desc",
                        "id": "message",
                      },
                    ],
                    "onSort": [Function],
                  }
              `);
      },
      EXTENDED_JEST_TIMEOUT
    );

    it(
      'should not apply unknown sorting',
      async () => {
        const component = await getComponent({
          ...getProps(),
          sort: [
            ['bytes', 'desc'],
            ['unknown', 'asc'],
            ['message', 'desc'],
          ],
          columns: ['bytes', 'message'],
        });

        expect(component.find(EuiDataGrid).last().prop('sorting')).toMatchInlineSnapshot(`
                  Object {
                    "columns": Array [
                      Object {
                        "direction": "desc",
                        "id": "bytes",
                      },
                      Object {
                        "direction": "desc",
                        "id": "message",
                      },
                    ],
                    "onSort": [Function],
                  }
              `);
      },
      EXTENDED_JEST_TIMEOUT
    );
  });

  describe('display settings', () => {
    it(
      'should set allowRowHeight to true if onUpdateRowHeight is provided',
      async () => {
        const component = await getComponent({
          ...getProps(),
          onUpdateRowHeight: jest.fn(),
        });

        expect(component.find(EuiDataGrid).first().prop('toolbarVisibility'))
          .toMatchInlineSnapshot(`
          Object {
            "additionalControls": null,
            "showColumnSelector": false,
            "showDisplaySelector": Object {
              "allowDensity": false,
              "allowResetButton": false,
              "allowRowHeight": true,
              "customRender": [Function],
            },
            "showFullScreenSelector": true,
            "showKeyboardShortcuts": true,
            "showSortSelector": true,
          }
        `);
      },
      EXTENDED_JEST_TIMEOUT
    );

    it(
      'should set allowRowHeight to false if onUpdateRowHeight is not provided',
      async () => {
        const component = await getComponent({
          ...getProps(),
          onUpdateSampleSize: jest.fn(),
          onUpdateRowHeight: undefined,
        });

        expect(component.find(EuiDataGrid).first().prop('toolbarVisibility'))
          .toMatchInlineSnapshot(`
          Object {
            "additionalControls": null,
            "showColumnSelector": false,
            "showDisplaySelector": Object {
              "allowDensity": false,
              "allowResetButton": false,
              "allowRowHeight": false,
              "customRender": [Function],
            },
            "showFullScreenSelector": true,
            "showKeyboardShortcuts": true,
            "showSortSelector": true,
          }
        `);
      },
      EXTENDED_JEST_TIMEOUT
    );

    it(
      'should set allowDensity to true if onUpdateDataGridDensity is provided',
      async () => {
        const component = await getComponent({
          ...getProps(),
          onUpdateRowHeight: jest.fn(),
          onUpdateDataGridDensity: jest.fn(),
        });

        expect(component.find(EuiDataGrid).first().prop('toolbarVisibility'))
          .toMatchInlineSnapshot(`
          Object {
            "additionalControls": null,
            "showColumnSelector": false,
            "showDisplaySelector": Object {
              "allowDensity": true,
              "allowResetButton": false,
              "allowRowHeight": true,
              "customRender": [Function],
            },
            "showFullScreenSelector": true,
            "showKeyboardShortcuts": true,
            "showSortSelector": true,
          }
        `);
      },
      EXTENDED_JEST_TIMEOUT
    );

    it(
      'should set allowDensity to false if onUpdateDataGridDensity is not provided',
      async () => {
        const component = await getComponent({
          ...getProps(),
          onUpdateSampleSize: jest.fn(),
          onUpdateRowHeight: jest.fn(),
          onUpdateDataGridDensity: undefined,
        });

        expect(component.find(EuiDataGrid).first().prop('toolbarVisibility'))
          .toMatchInlineSnapshot(`
          Object {
            "additionalControls": null,
            "showColumnSelector": false,
            "showDisplaySelector": Object {
              "allowDensity": false,
              "allowResetButton": false,
              "allowRowHeight": true,
              "customRender": [Function],
            },
            "showFullScreenSelector": true,
            "showKeyboardShortcuts": true,
            "showSortSelector": true,
          }
        `);
      },
      EXTENDED_JEST_TIMEOUT
    );

    it(
      'should hide display settings if no handlers provided',
      async () => {
        const component = await getComponent({
          ...getProps(),
          onUpdateRowHeight: undefined,
          onUpdateSampleSize: undefined,
        });

        expect(component.find(EuiDataGrid).first().prop('toolbarVisibility'))
          .toMatchInlineSnapshot(`
                  Object {
                    "additionalControls": null,
                    "showColumnSelector": false,
                    "showDisplaySelector": undefined,
                    "showFullScreenSelector": true,
                    "showKeyboardShortcuts": true,
                    "showSortSelector": true,
                  }
              `);
      },
      EXTENDED_JEST_TIMEOUT
    );
  });

  describe('custom control columns', () => {
    it(
      'should be able to customise the leading controls',
      async () => {
        const component = await getComponent({
          ...getProps(),
          expandedDoc: {
            id: 'test',
            raw: {
              _index: 'test_i',
              _id: 'test',
            },
            flattened: { test: jest.fn() },
          },
          setExpandedDoc: jest.fn(),
          renderDocumentView: jest.fn(),
          externalControlColumns: [testLeadingControlColumn],
          rowAdditionalLeadingControls: mockRowAdditionalLeadingControls,
        });

        expect(findTestSubject(component, 'test-body-control-column-cell').exists()).toBeTruthy();
        expect(
          findTestSubject(component, 'exampleRowControl-visBarVerticalStacked').exists()
        ).toBeTruthy();
        expect(
          findTestSubject(component, 'unifiedDataTable_additionalRowControl_menuControl').exists()
        ).toBeTruthy();
      },
      EXTENDED_JEST_TIMEOUT
    );

    it(
      'should be able to customise the trailing controls',
      async () => {
        const component = await getComponent({
          ...getProps(),
          expandedDoc: {
            id: 'test',
            raw: {
              _index: 'test_i',
              _id: 'test',
            },
            flattened: { test: jest.fn() },
          },
          setExpandedDoc: jest.fn(),
          renderDocumentView: jest.fn(),
          externalControlColumns: [testLeadingControlColumn],
          trailingControlColumns: testTrailingControlColumns,
        });

        expect(findTestSubject(component, 'test-body-control-column-cell').exists()).toBeTruthy();
        expect(
          findTestSubject(component, 'test-trailing-column-popover-button').exists()
        ).toBeTruthy();
      },
      EXTENDED_JEST_TIMEOUT
    );
  });

  describe('externalControlColumns', () => {
    it(
      'should render external leading control columns',
      async () => {
        const component = await getComponent({
          ...getProps(),
          expandedDoc: {
            id: 'test',
            raw: {
              _index: 'test_i',
              _id: 'test',
            },
            flattened: { test: jest.fn() },
          },
          setExpandedDoc: jest.fn(),
          renderDocumentView: jest.fn(),
          externalControlColumns: [testLeadingControlColumn],
        });

        expect(findTestSubject(component, 'docTableExpandToggleColumn').exists()).toBeTruthy();
        expect(findTestSubject(component, 'test-body-control-column-cell').exists()).toBeTruthy();
      },
      EXTENDED_JEST_TIMEOUT
    );
  });

  it(
    'should render provided in renderDocumentView DocumentView on expand clicked',
    async () => {
      const expandedDoc = {
        id: 'test',
        raw: {
          _index: 'test_i',
          _id: 'test',
        },
        flattened: { test: jest.fn() },
      };
      const columnsMetaOverride = { testField: { type: 'number' as DatatableColumnType } };
      const renderDocumentViewMock = jest.fn((hit: DataTableRecord) => (
        <div data-test-subj="test-document-view">{hit.id}</div>
      ));

      const component = await getComponent({
        ...getProps(),
        expandedDoc,
        setExpandedDoc: jest.fn(),
        columnsMeta: columnsMetaOverride,
        renderDocumentView: renderDocumentViewMock,
        externalControlColumns: [testLeadingControlColumn],
      });

      findTestSubject(component, 'docTableExpandToggleColumn').first().simulate('click');
      expect(findTestSubject(component, 'test-document-view').exists()).toBeTruthy();
      expect(renderDocumentViewMock).toHaveBeenLastCalledWith(
        expandedDoc,
        getProps().rows,
        ['_source'],
        columnsMetaOverride
      );
    },
    EXTENDED_JEST_TIMEOUT
  );

  describe('externalAdditionalControls', () => {
    it(
      'should render external additional toolbar controls',
      async () => {
        const component = await getComponent({
          ...getProps(),
          columns: ['message'],
          externalAdditionalControls: <EuiButton data-test-subj="test-additional-control" />,
        });

        expect(findTestSubject(component, 'test-additional-control').exists()).toBeTruthy();
        expect(findTestSubject(component, 'dataGridColumnSelectorButton').exists()).toBeTruthy();
      },
      EXTENDED_JEST_TIMEOUT
    );
  });

  describe('externalCustomRenderers', () => {
    it(
      'should render only host column with the custom renderer, message should be rendered with the default cell renderer',
      async () => {
        const component = await getComponent({
          ...getProps(),
          columns: ['message', 'host'],
          externalCustomRenderers: {
            host: (props: EuiDataGridCellValueElementProps) => (
              <div data-test-subj={`test-renderer-${props.columnId}`}>{props.columnId}</div>
            ),
          },
        });

        expect(findTestSubject(component, 'test-renderer-host').exists()).toBeTruthy();
        expect(findTestSubject(component, 'test-renderer-message').exists()).toBeFalsy();
      },
      EXTENDED_JEST_TIMEOUT
    );
  });

  describe('renderCustomGridBody', () => {
    it(
      'should render custom grid body for each row',
      async () => {
        const component = await getComponent({
          ...getProps(),
          columns: ['message', 'host'],
          trailingControlColumns: [
            {
              id: 'row-details',

              // The header cell should be visually hidden, but available to screen readers
              width: 0,
              headerCellRender: () => <></>,
              headerCellProps: { className: 'euiScreenReaderOnly' },

              // The footer cell can be hidden to both visual & SR users, as it does not contain meaningful information
              footerCellProps: { style: { display: 'none' } },

              // When rendering this custom cell, we'll want to override
              // the automatic width/heights calculated by EuiDataGrid
              rowCellRender: jest.fn(),
            },
          ],
          renderCustomGridBody: (props: EuiDataGridCustomBodyProps) => (
            <div data-test-subj="test-renderer-custom-grid-body">
              <EuiButton />
            </div>
          ),
        });

        expect(findTestSubject(component, 'test-renderer-custom-grid-body').exists()).toBeTruthy();
      },
      EXTENDED_JEST_TIMEOUT
    );
  });

  describe('componentsTourSteps', () => {
    it(
      'should render tour step for the first row of leading control column expandButton',
      async () => {
        const component = await getComponent({
          ...getProps(),
          expandedDoc: {
            id: 'test',
            raw: {
              _index: 'test_i',
              _id: 'test',
            },
            flattened: { test: jest.fn() },
          },
          setExpandedDoc: jest.fn(),
          renderDocumentView: jest.fn(),
          componentsTourSteps: { expandButton: 'test-expand' },
        });

        const gridExpandBtn = findTestSubject(component, 'docTableExpandToggleColumn').first();
        const tourStep = gridExpandBtn.getDOMNode().getAttribute('id');
        expect(tourStep).toEqual('test-expand');
      },
      EXTENDED_JEST_TIMEOUT
    );
  });

  describe('renderCustomToolbar', () => {
    it(
      'should render a custom toolbar',
      async () => {
        let toolbarParams: Record<string, unknown> = {};
        let gridParams: Record<string, unknown> = {};
        const renderCustomToolbarMock = jest.fn((props) => {
          toolbarParams = props.toolbarProps;
          gridParams = props.gridProps;
          return <div data-test-subj="custom-toolbar">Custom layout</div>;
        });
        const component = await getComponent({
          ...getProps(),
          renderCustomToolbar: renderCustomToolbarMock,
        });

        // custom toolbar should be rendered
        expect(findTestSubject(component, 'custom-toolbar').exists()).toBe(true);

        expect(renderCustomToolbarMock).toHaveBeenLastCalledWith(
          expect.objectContaining({
            toolbarProps: expect.objectContaining({
              hasRoomForGridControls: true,
            }),
            gridProps: expect.objectContaining({
              additionalControls: null,
            }),
          })
        );

        // the default eui controls should be available for custom rendering
        expect(toolbarParams?.columnSortingControl).toBeTruthy();
        expect(toolbarParams?.keyboardShortcutsControl).toBeTruthy();
        expect(gridParams?.additionalControls).toBe(null);

        // additional controls become available after selecting a document
        act(() => {
          component
            .find('.euiDataGridRowCell[data-gridcell-column-id="select"] .euiCheckbox__input')
            .first()
            .simulate('change');
        });

        expect(toolbarParams?.keyboardShortcutsControl).toBeTruthy();
        expect(gridParams?.additionalControls).toBeTruthy();
      },
      EXTENDED_JEST_TIMEOUT
    );
  });

  describe('gridStyleOverride', () => {
    it(
      'should render the grid with the default style if no gridStyleOverride is provided',
      async () => {
        const component = await getComponent({
          ...getProps(),
        });

        const grid = findTestSubject(component, 'docTable');

        expect(grid.hasClass('euiDataGrid--bordersHorizontal')).toBeTruthy();
        expect(grid.hasClass('euiDataGrid--fontSizeSmall')).toBeTruthy();
        expect(grid.hasClass('euiDataGrid--paddingSmall')).toBeTruthy();
        expect(grid.hasClass('euiDataGrid--rowHoverHighlight')).toBeTruthy();
        expect(grid.hasClass('euiDataGrid--headerUnderline')).toBeTruthy();
        expect(grid.hasClass('euiDataGrid--stripes')).toBeTruthy();
      },
      EXTENDED_JEST_TIMEOUT
    );

    it(
      'should render the grid with style override if gridStyleOverride is provided',
      async () => {
        const component = await getComponent({
          ...getProps(),
          gridStyleOverride: {
            stripes: false,
            rowHover: 'none',
            border: 'none',
          },
        });

        const grid = findTestSubject(component, 'docTable');

        expect(grid.hasClass('euiDataGrid--stripes')).toBeFalsy();
        expect(grid.hasClass('euiDataGrid--rowHoverHighlight')).toBeFalsy();
        expect(grid.hasClass('euiDataGrid--bordersNone')).toBeTruthy();
      },
      EXTENDED_JEST_TIMEOUT
    );
  });

  describe('rowLineHeightOverride', () => {
    it(
      'should render the grid with the default row line height if no rowLineHeightOverride is provided',
      async () => {
        const component = await getComponent({
          ...getProps(),
        });

        const gridRowCell = findTestSubject(component, 'dataGridRowCell').first();
        expect(gridRowCell.prop('style')).toMatchObject({
          lineHeight: '1.6em',
        });
      },
      EXTENDED_JEST_TIMEOUT
    );

    it(
      'should render the grid with row line height override if rowLineHeightOverride is provided',
      async () => {
        const component = await getComponent({
          ...getProps(),
          rowLineHeightOverride: '24px',
        });

        const gridRowCell = findTestSubject(component, 'dataGridRowCell').first();
        expect(gridRowCell.prop('style')).toMatchObject({
          lineHeight: '24px',
        });
      },
      EXTENDED_JEST_TIMEOUT
    );
  });

  describe('document comparison', () => {
    const getSelectedDocumentsButton = () => screen.queryByTestId('unifiedDataTableSelectionBtn');

    const selectDocument = async (document: EsHitRecord) =>
      await userEvent.click(screen.getByTestId(`dscGridSelectDoc-${getDocId(document)}`));

    const openSelectedRowsMenu = async () => {
      await userEvent.click(await screen.findByTestId('unifiedDataTableSelectionBtn'));
      await screen.findAllByText('Clear selection');
    };

    const closeSelectedRowsMenu = async () => {
      await userEvent.click(await screen.findByTestId('unifiedDataTableSelectionBtn'));
    };

    const getCompareDocumentsButton = () =>
      screen.queryByTestId('unifiedDataTableCompareSelectedDocuments');

    const goToComparisonMode = async () => {
      await selectDocument(esHitsMock[0]);
      await selectDocument(esHitsMock[1]);
      await openSelectedRowsMenu();
      await waitForEuiPopoverOpen();
      await userEvent.click(await screen.findByTestId('unifiedDataTableCompareSelectedDocuments'));
      await screen.findByText('Comparing 2 documents');
      // EuiDataGrid makes state updates after calling requestAnimationFrame, which can lead
      // to "Can't perform a React state update on an unmounted component." warnings in tests,
      // so we need to wait for the next animation frame to avoid this
      await screen.findByTestId('unifiedDataTableCompareDocuments');
      await act(() => new Promise((resolve) => requestAnimationFrame(() => resolve(void 0))));
    };

    const getFullScreenButton = () => screen.queryByTestId('dataGridFullScreenButton');

    const getFieldColumns = () =>
      screen
        .queryAllByTestId('unifiedDataTableComparisonFieldName')
        .map(({ textContent }) => textContent);

    const getColumnHeaders = () =>
      screen
        .getAllByRole('columnheader')
        .map((header) => header.querySelector('.euiDataGridHeaderCell__content')?.textContent);

    const getCellValues = () =>
      Array.from(document.querySelectorAll(`.${CELL_CLASS}`)).map(({ textContent }) => textContent);

    it(
      'should not allow comparison if less than 2 documents are selected',
      async () => {
        await renderDataTable({ enableComparisonMode: true });
        expect(getSelectedDocumentsButton()).not.toBeInTheDocument();
        await selectDocument(esHitsMock[0]);
        expect(getSelectedDocumentsButton()).toBeInTheDocument();
        await openSelectedRowsMenu();
        expect(getCompareDocumentsButton()).not.toBeInTheDocument();
        await closeSelectedRowsMenu();
        await selectDocument(esHitsMock[1]);
        expect(getSelectedDocumentsButton()).toBeInTheDocument();
        await openSelectedRowsMenu();
        waitFor(() => {
          expect(getCompareDocumentsButton()).toBeInTheDocument();
        });
        await closeSelectedRowsMenu();
      },
      EXTENDED_JEST_TIMEOUT
    );

    it(
      'should not allow comparison if comparison mode is disabled',
      async () => {
        await renderDataTable({ enableComparisonMode: false });
        await selectDocument(esHitsMock[0]);
        await selectDocument(esHitsMock[1]);
        await openSelectedRowsMenu();
        expect(getCompareDocumentsButton()).not.toBeInTheDocument();
        await closeSelectedRowsMenu();
      },
      EXTENDED_JEST_TIMEOUT
    );

    it(
      'should allow comparison if 2 or more documents are selected and comparison mode is enabled',
      async () => {
        await renderDataTable({ enableComparisonMode: true });
        await goToComparisonMode();
        expect(getColumnHeaders()).toEqual(['Field', '1', '2']);
        expect(getCellValues()).toEqual(['', '', 'i', 'i', '20', '', '', 'jpg', 'test1', '']);
      },
      EXTENDED_JEST_TIMEOUT
    );

    it(
      'should show full screen button if showFullScreenButton is true',
      async () => {
        await renderDataTable({ enableComparisonMode: true, showFullScreenButton: true });
        await goToComparisonMode();
        expect(getFullScreenButton()).toBeInTheDocument();
      },
      EXTENDED_JEST_TIMEOUT
    );

    it(
      'should hide full screen button if showFullScreenButton is false',
      async () => {
        await renderDataTable({ enableComparisonMode: true, showFullScreenButton: false });
        await goToComparisonMode();
        expect(getFullScreenButton()).not.toBeInTheDocument();
      },
      EXTENDED_JEST_TIMEOUT
    );

    it(
      'should render selected fields',
      async () => {
        const columns = ['bytes', 'message'];
        await renderDataTable({ enableComparisonMode: true, columns });
        await goToComparisonMode();
        expect(getFieldColumns()).toEqual(['@timestamp', ...columns]);
      },
      EXTENDED_JEST_TIMEOUT
    );

    it(
      'should render all available fields if no fields are selected',
      async () => {
        await renderDataTable({ enableComparisonMode: true });
        await goToComparisonMode();
        expect(getFieldColumns()).toEqual([
          '@timestamp',
          '_index',
          'bytes',
          'extension',
          'message',
        ]);
      },
      EXTENDED_JEST_TIMEOUT
    );
  });

  describe('getRowIndicator', () => {
    it(
      'should render the color indicator control',
      async () => {
        const component = await getComponent({
          ...getProps(),
          getRowIndicator: jest.fn(() => ({ color: 'blue', label: 'test' })),
        });

        expect(
          findTestSubject(component, 'dataGridHeaderCell-colorIndicator').exists()
        ).toBeTruthy();
        expect(
          findTestSubject(component, 'unifiedDataTableRowColorIndicatorCell').first().prop('title')
        ).toEqual('test');
      },
      EXTENDED_JEST_TIMEOUT
    );

    it(
      'should not render the color indicator control by default',
      async () => {
        const component = await getComponent({
          ...getProps(),
          getRowIndicator: undefined,
        });

        expect(
          findTestSubject(component, 'dataGridHeaderCell-colorIndicator').exists()
        ).toBeFalsy();
      },
      EXTENDED_JEST_TIMEOUT
    );
  });

  describe('columns', () => {
    // Default column width in EUI is hardcoded to 100px for Jest envs
    const EUI_DEFAULT_COLUMN_WIDTH = '100px';
    const getColumnHeader = (name: string) => screen.getByRole('columnheader', { name });
    const queryColumnHeader = (name: string) => screen.queryByRole('columnheader', { name });
    const openColumnActions = async (name: string) => {
      const actionsButton = screen.getByTestId(`dataGridHeaderCellActionButton-${name}`);
      await userEvent.click(actionsButton);
      await waitForEuiPopoverOpen();
    };
    const clickColumnAction = async (name: string) => {
      const action = screen.getByRole('button', { name });
      await userEvent.click(action);
    };
    const queryButton = (name: string) => screen.queryByRole('button', { name });

    it(
      'should reset the last column to auto width if only absolute width columns remain',
      async () => {
        await renderDataTable({
          columns: ['message', 'extension', 'bytes'],
          settings: {
            columns: {
              extension: { width: 50 },
              bytes: { width: 50 },
            },
          },
        });
        expect(getColumnHeader('message')).toHaveStyle({ width: EUI_DEFAULT_COLUMN_WIDTH });
        expect(getColumnHeader('extension')).toHaveStyle({ width: '50px' });
        expect(getColumnHeader('bytes')).toHaveStyle({ width: '50px' });
        await openColumnActions('message');
        await clickColumnAction('Remove column');
        await waitFor(() => {
          expect(queryColumnHeader('message')).not.toBeInTheDocument();
        });
        expect(getColumnHeader('extension')).toHaveStyle({ width: '50px' });
        expect(getColumnHeader('bytes')).toHaveStyle({ width: EUI_DEFAULT_COLUMN_WIDTH });
      },
      EXTENDED_JEST_TIMEOUT
    );

    it(
      'should not reset the last column to auto width when there are remaining auto width columns',
      async () => {
        await renderDataTable({
          columns: ['message', 'extension', 'bytes'],
          settings: {
            columns: {
              bytes: { width: 50 },
            },
          },
        });
        expect(getColumnHeader('message')).toHaveStyle({ width: EUI_DEFAULT_COLUMN_WIDTH });
        expect(getColumnHeader('extension')).toHaveStyle({ width: EUI_DEFAULT_COLUMN_WIDTH });
        expect(getColumnHeader('bytes')).toHaveStyle({ width: '50px' });
        await openColumnActions('message');
        await clickColumnAction('Remove column');
        await waitFor(() => {
          expect(queryColumnHeader('message')).not.toBeInTheDocument();
        });
        expect(getColumnHeader('extension')).toHaveStyle({ width: EUI_DEFAULT_COLUMN_WIDTH });
        expect(getColumnHeader('bytes')).toHaveStyle({ width: '50px' });
      },
      EXTENDED_JEST_TIMEOUT
    );

    it(
      'should show the reset width button only for absolute width columns, and allow resetting to default width',
      async () => {
        await renderDataTable({
          columns: ['message', 'extension'],
          settings: {
            columns: {
              '@timestamp': { width: 50 },
              extension: { width: 50 },
            },
          },
        });
        expect(getColumnHeader('@timestamp')).toHaveStyle({ width: '50px' });
        await openColumnActions('@timestamp');
        await clickColumnAction('Reset width');
        await waitFor(() => {
          expect(getColumnHeader('@timestamp')).toHaveStyle({
            width: `${defaultTimeColumnWidth}px`,
          });
        });
        expect(getColumnHeader('message')).toHaveStyle({ width: EUI_DEFAULT_COLUMN_WIDTH });
        await openColumnActions('message');
        expect(queryButton('Reset width')).not.toBeInTheDocument();
        await waitFor(() => {
          expect(getColumnHeader('extension')).toHaveStyle({ width: '50px' });
        });
        await openColumnActions('extension');
        await clickColumnAction('Reset width');
        await waitFor(() => {
          expect(getColumnHeader('extension')).toHaveStyle({ width: EUI_DEFAULT_COLUMN_WIDTH });
        });
      },
      EXTENDED_JEST_TIMEOUT
    );

    it(
      'should have columnVisibility configuration',
      async () => {
        const component = await getComponent({
          ...getProps(),
          columns: ['message'],
          canDragAndDropColumns: true,
        });
        expect(component.find(EuiDataGrid).last().prop('columnVisibility')).toMatchInlineSnapshot(`
          Object {
            "canDragAndDropColumns": true,
            "setVisibleColumns": [Function],
            "visibleColumns": Array [
              "@timestamp",
              "message",
            ],
          }
        `);
      },
      EXTENDED_JEST_TIMEOUT
    );

    it(
      'should disable drag&drop if Summary is present',
      async () => {
        const component = await getComponent({
          ...getProps(),
          columns: [],
          canDragAndDropColumns: true,
        });
        expect(component.find(EuiDataGrid).last().prop('columnVisibility')).toMatchInlineSnapshot(`
          Object {
            "canDragAndDropColumns": false,
            "setVisibleColumns": [Function],
            "visibleColumns": Array [
              "@timestamp",
              "_source",
            ],
          }
        `);
      },
      EXTENDED_JEST_TIMEOUT
    );
  });

  describe('pagination', () => {
    const onChangePageMock = jest.fn();
    beforeEach(() => {
      jest.clearAllMocks();
    });
    test('should effect pageIndex change', async () => {
      const component = await getComponent({
        ...getProps(),
        onUpdatePageIndex: onChangePageMock,
        rowsPerPageState: 1,
        rowsPerPageOptions: [1, 5],
      });

      expect(findTestSubject(component, 'pagination-button-1').exists()).toBeTruthy();
      onChangePageMock.mockClear();
      findTestSubject(component, 'pagination-button-1').simulate('click');
      expect(onChangePageMock).toHaveBeenNthCalledWith(1, 1);
    });

    test('should effect pageIndex change when itemsPerPage has been changed', async () => {
      /*
       * Use Case:
       *
       * Let's say we have 4 pages and we are on page 1 with 1 item per page.
       * Now if we change items per page to 4, it should automatically change the pageIndex to 0.
       *
       * */
      const component = await getComponent({
        ...getProps(),
        onUpdatePageIndex: onChangePageMock,
        rowsPerPageState: 1,
        rowsPerPageOptions: [1, 4],
      });

      expect(findTestSubject(component, 'pagination-button-4').exists()).toBeTruthy();
      onChangePageMock.mockClear();
      // go to last page
      findTestSubject(component, 'pagination-button-4').simulate('click');
      expect(onChangePageMock).toHaveBeenNthCalledWith(1, 4);
      onChangePageMock.mockClear();

      // Change items per Page so that pageIndex autoamtically changes.
      expect(findTestSubject(component, 'tablePaginationPopoverButton').text()).toBe(
        'Rows per page: 1'
      );
      findTestSubject(component, 'tablePaginationPopoverButton').simulate('click');
      component.setProps({
        rowsPerPageState: 5,
      });

      await waitFor(() => {
        expect(findTestSubject(component, 'tablePaginationPopoverButton').text()).toBe(
          'Rows per page: 5'
        );
      });

      expect(onChangePageMock).toHaveBeenNthCalledWith(1, 0);
    });
  });

  describe('enableInTableSearch', () => {
    it(
      'should render find-button if enableInTableSearch is true and no custom toolbar specified',
      async () => {
        await renderDataTable({ enableInTableSearch: true, columns: ['bytes'] });

        expect(screen.getByTestId(BUTTON_TEST_SUBJ)).toBeInTheDocument();
      },
      EXTENDED_JEST_TIMEOUT
    );

    it(
      'should render find-button if enableInTableSearch is true and renderCustomToolbar is provided',
      async () => {
        const renderCustomToolbarMock = jest.fn((props) => {
          return (
            <div data-test-subj="custom-toolbar">
              Custom layout {props.gridProps.inTableSearchControl}
            </div>
          );
        });

        await renderDataTable({
          enableInTableSearch: true,
          columns: ['bytes'],
          renderCustomToolbar: renderCustomToolbarMock,
        });

        expect(screen.getByTestId('custom-toolbar')).toBeInTheDocument();
        expect(screen.getByTestId(BUTTON_TEST_SUBJ)).toBeInTheDocument();
      },
      EXTENDED_JEST_TIMEOUT
    );

    it(
      'should not render find-button if enableInTableSearch is false',
      async () => {
        await renderDataTable({ enableInTableSearch: false, columns: ['bytes'] });

        expect(screen.queryByTestId(BUTTON_TEST_SUBJ)).not.toBeInTheDocument();
      },
      EXTENDED_JEST_TIMEOUT
    );

    it(
      'should find the search term in the table',
      async () => {
        await renderDataTable({ enableInTableSearch: true, columns: ['bytes'] });

        expect(screen.getByTestId(BUTTON_TEST_SUBJ)).toBeInTheDocument();

        screen.getByTestId(BUTTON_TEST_SUBJ).click();

        expect(screen.getByTestId(INPUT_TEST_SUBJ)).toBeInTheDocument();

        const searchTerm = '50';
        const input = screen.getByTestId(INPUT_TEST_SUBJ);
        fireEvent.change(input, { target: { value: searchTerm } });
        expect(input).toHaveValue(searchTerm);

        await waitFor(() => {
          // 3 results for `bytes` column with value `50`
          expect(screen.getByTestId(COUNTER_TEST_SUBJ)).toHaveTextContent('1/3');
        });

        await waitFor(() => {
          const highlights = screen.getAllByText(searchTerm);
          expect(highlights.length).toBeGreaterThan(0);
          expect(
            highlights.every(
              (highlight) =>
                highlight.tagName === 'MARK' && highlight.classList.contains(HIGHLIGHT_CLASS_NAME)
            )
          ).toBe(true);
        });

        screen.getByTestId(BUTTON_NEXT_TEST_SUBJ).click();

        await waitFor(() => {
          expect(screen.getByTestId(COUNTER_TEST_SUBJ)).toHaveTextContent('2/3');
        });

        const anotherSearchTerm = 'random';
        fireEvent.change(screen.getByTestId(INPUT_TEST_SUBJ), {
          target: { value: anotherSearchTerm },
        });
        expect(screen.getByTestId(INPUT_TEST_SUBJ)).toHaveValue(anotherSearchTerm);

        await waitFor(() => {
          // no results
          expect(screen.getByTestId(COUNTER_TEST_SUBJ)).toHaveTextContent('0/0');
        });
      },
      EXTENDED_JEST_TIMEOUT
    );
  });
});
