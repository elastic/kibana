/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { ReactWrapper } from 'enzyme';
import {
  EuiButton,
  EuiDataGrid,
  EuiDataGridCellValueElementProps,
  EuiDataGridCustomBodyProps,
} from '@elastic/eui';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { act } from 'react-dom/test-utils';
import { findTestSubject } from '@elastic/eui/lib/test';
import { buildDataViewMock, deepMockedFields, esHitsMock } from '@kbn/discover-utils/src/__mocks__';
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
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CELL_CLASS } from '../utils/get_render_cell_value';

const mockUseDataGridColumnsCellActions = jest.fn((prop: unknown) => []);
jest.mock('@kbn/cell-actions', () => ({
  ...jest.requireActual('@kbn/cell-actions'),
  useDataGridColumnsCellActions: (prop: unknown) => mockUseDataGridColumnsCellActions(prop),
}));

export const dataViewMock = buildDataViewMock({
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
    useNewFieldsApi: true,
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

async function getComponent(props: UnifiedDataTableProps = getProps()) {
  const component = mountWithIntl(<DataTable {...props} />);
  await act(async () => {
    // needed by cell actions to complete async loading
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

    test('no documents are selected initially', async () => {
      expect(getSelectedDocNr(component)).toBe(0);
      expect(getDisplayedDocNr(component)).toBe(5);
    });

    test('Allows selection/deselection of multiple documents', async () => {
      await toggleDocSelection(component, esHitsMock[0]);
      expect(getSelectedDocNr(component)).toBe(1);
      await toggleDocSelection(component, esHitsMock[1]);
      expect(getSelectedDocNr(component)).toBe(2);
      await toggleDocSelection(component, esHitsMock[1]);
      expect(getSelectedDocNr(component)).toBe(1);
    });

    test('deselection of all selected documents', async () => {
      await toggleDocSelection(component, esHitsMock[0]);
      await toggleDocSelection(component, esHitsMock[1]);
      expect(getSelectedDocNr(component)).toBe(2);
      findTestSubject(component, 'unifiedDataTableSelectionBtn').simulate('click');
      findTestSubject(component, 'dscGridClearSelectedDocuments').simulate('click');
      expect(getSelectedDocNr(component)).toBe(0);
    });

    test('showing only selected documents and undo selection', async () => {
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
    });

    test('showing selected documents, underlying data changes, all documents are displayed, selection is gone', async () => {
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
    });

    test('showing only selected documents and remove filter deselecting each doc manually', async () => {
      await toggleDocSelection(component, esHitsMock[0]);
      findTestSubject(component, 'unifiedDataTableSelectionBtn').simulate('click');
      findTestSubject(component, 'dscGridShowSelectedDocuments').simulate('click');
      expect(getDisplayedDocNr(component)).toBe(1);
      await toggleDocSelection(component, esHitsMock[0]);
      expect(getDisplayedDocNr(component)).toBe(5);
      await toggleDocSelection(component, esHitsMock[0]);
      expect(getDisplayedDocNr(component)).toBe(5);
    });

    test('copying selected documents to clipboard as JSON', async () => {
      await toggleDocSelection(component, esHitsMock[0]);
      findTestSubject(component, 'unifiedDataTableSelectionBtn').simulate('click');
      findTestSubject(component, 'dscGridCopySelectedDocumentsJSON').simulate('click');
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        '[{"_index":"i","_id":"1","_score":1,"_type":"_doc","_source":{"date":"2020-20-01T12:12:12.123","message":"test1","bytes":20}}]'
      );
    });

    test('copying selected documents to clipboard as text', async () => {
      await toggleDocSelection(component, esHitsMock[2]);
      await toggleDocSelection(component, esHitsMock[1]);
      findTestSubject(component, 'unifiedDataTableSelectionBtn').simulate('click');
      findTestSubject(component, 'unifiedDataTableCopyRowsAsText').simulate('click');
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        '"\'@timestamp"\t"_index"\t"_score"\tbytes\tdate\textension\tmessage\tname\n-\ti\t1\t-\t"2020-20-01T12:12:12.124"\tjpg\t-\ttest2\n-\ti\t1\t50\t"2020-20-01T12:12:12.124"\tgif\t-\ttest3'
      );
    });

    test('copying selected columns to clipboard as text', async () => {
      component = await getComponent({
        ...getProps(),
        columns: ['date', 'extension', 'name'],
      });
      await toggleDocSelection(component, esHitsMock[2]);
      await toggleDocSelection(component, esHitsMock[1]);
      findTestSubject(component, 'unifiedDataTableSelectionBtn').simulate('click');
      findTestSubject(component, 'unifiedDataTableCopyRowsAsText').simulate('click');
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        '"\'@timestamp"\tdate\textension\tname\n-\t"2020-20-01T12:12:12.124"\tjpg\ttest2\n-\t"2020-20-01T12:12:12.124"\tgif\ttest3'
      );
    });
  });

  describe('edit field button', () => {
    it('should render the edit field button if onFieldEdited is provided', async () => {
      const component = await getComponent({
        ...getProps(),
        columns: ['message'],
        onFieldEdited: jest.fn(),
      });
      expect(findTestSubject(component, 'dataGridHeaderCellActionGroup-message').exists()).toBe(
        false
      );
      findTestSubject(component, 'dataGridHeaderCell-message').find('button').simulate('click');
      expect(findTestSubject(component, 'dataGridHeaderCellActionGroup-message').exists()).toBe(
        true
      );
      expect(findTestSubject(component, 'gridEditFieldButton').exists()).toBe(true);
    });

    it('should not render the edit field button if onFieldEdited is not provided', async () => {
      const component = await getComponent({
        ...getProps(),
        columns: ['message'],
      });
      expect(findTestSubject(component, 'dataGridHeaderCellActionGroup-message').exists()).toBe(
        false
      );
      findTestSubject(component, 'dataGridHeaderCell-message').find('button').simulate('click');
      expect(findTestSubject(component, 'dataGridHeaderCellActionGroup-message').exists()).toBe(
        true
      );
      expect(findTestSubject(component, 'gridEditFieldButton').exists()).toBe(false);
    });
  });

  describe('cellActionsTriggerId', () => {
    it('should call useDataGridColumnsCellActions with empty params when no cellActionsTriggerId is provided', async () => {
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
    });

    it('should call useDataGridColumnsCellActions properly when cellActionsTriggerId defined', async () => {
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
    });
  });

  describe('sorting', () => {
    it('should enable in memory sorting with plain records', async () => {
      const component = await getComponent({
        ...getProps(),
        columns: ['message'],
        isPlainRecord: true,
      });

      expect(
        (
          findTestSubject(component, 'docTable')
            .find('EuiDataGridInMemoryRenderer')
            .first()
            .props() as Record<string, string>
        ).inMemory
      ).toMatchInlineSnapshot(`
        Object {
          "level": "sorting",
        }
      `);
    });

    it('should apply sorting', async () => {
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
    });

    it('should not apply unknown sorting', async () => {
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
    });
  });

  describe('display settings', () => {
    it('should include additional display settings if onUpdateSampleSize is provided', async () => {
      const component = await getComponent({
        ...getProps(),
        sampleSizeState: 150,
        onUpdateSampleSize: jest.fn(),
        onUpdateRowHeight: jest.fn(),
      });

      expect(component.find(EuiDataGrid).first().prop('toolbarVisibility')).toMatchInlineSnapshot(`
        Object {
          "additionalControls": null,
          "showColumnSelector": false,
          "showDisplaySelector": Object {
            "additionalDisplaySettings": <UnifiedDataTableAdditionalDisplaySettings
              headerRowHeight="custom"
              headerRowHeightLines={1}
              onChangeRowHeight={[Function]}
              onChangeRowHeightLines={[Function]}
              onChangeSampleSize={[MockFunction]}
              rowHeight="custom"
              rowHeightLines={3}
              sampleSize={150}
            />,
            "allowDensity": false,
            "allowResetButton": false,
            "allowRowHeight": false,
          },
          "showFullScreenSelector": true,
          "showSortSelector": true,
        }
      `);
    });

    it('should not include additional display settings if onUpdateSampleSize is not provided', async () => {
      const component = await getComponent({
        ...getProps(),
        sampleSizeState: 200,
        onUpdateRowHeight: jest.fn(),
      });

      expect(component.find(EuiDataGrid).first().prop('toolbarVisibility')).toMatchInlineSnapshot(`
        Object {
          "additionalControls": null,
          "showColumnSelector": false,
          "showDisplaySelector": Object {
            "additionalDisplaySettings": <UnifiedDataTableAdditionalDisplaySettings
              headerRowHeight="custom"
              headerRowHeightLines={1}
              onChangeRowHeight={[Function]}
              onChangeRowHeightLines={[Function]}
              rowHeight="custom"
              rowHeightLines={3}
              sampleSize={200}
            />,
            "allowDensity": false,
            "allowResetButton": false,
            "allowRowHeight": false,
          },
          "showFullScreenSelector": true,
          "showSortSelector": true,
        }
      `);
    });

    it('should hide display settings if no handlers provided', async () => {
      const component = await getComponent({
        ...getProps(),
        onUpdateRowHeight: undefined,
        onUpdateSampleSize: undefined,
      });

      expect(component.find(EuiDataGrid).first().prop('toolbarVisibility')).toMatchInlineSnapshot(`
        Object {
          "additionalControls": null,
          "showColumnSelector": false,
          "showDisplaySelector": undefined,
          "showFullScreenSelector": true,
          "showSortSelector": true,
        }
      `);
    });
  });

  describe('custom control columns', () => {
    it('should be able to customise the leading controls', async () => {
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
    });

    it('should be able to customise the trailing controls', async () => {
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
    });
  });

  describe('externalControlColumns', () => {
    it('should render external leading control columns', async () => {
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
    });
  });

  it('should render provided in renderDocumentView DocumentView on expand clicked', async () => {
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
  });

  describe('externalAdditionalControls', () => {
    it('should render external additional toolbar controls', async () => {
      const component = await getComponent({
        ...getProps(),
        columns: ['message'],
        externalAdditionalControls: <EuiButton data-test-subj="test-additional-control" />,
      });

      expect(findTestSubject(component, 'test-additional-control').exists()).toBeTruthy();
      expect(findTestSubject(component, 'dataGridColumnSelectorButton').exists()).toBeTruthy();
    });
  });

  describe('externalCustomRenderers', () => {
    it('should render only host column with the custom renderer, message should be rendered with the default cell renderer', async () => {
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
    });
  });

  describe('renderCustomGridBody', () => {
    it('should render custom grid body for each row', async () => {
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
    });
  });

  describe('componentsTourSteps', () => {
    it('should render tour step for the first row of leading control column expandButton', async () => {
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
    });
  });

  describe('renderCustomToolbar', () => {
    it('should render a custom toolbar', async () => {
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
    });
  });

  describe('gridStyleOverride', () => {
    it('should render the grid with the default style if no gridStyleOverride is provided', async () => {
      const component = await getComponent({
        ...getProps(),
      });

      const grid = findTestSubject(component, 'docTable');

      expect(grid.hasClass('euiDataGrid--bordersHorizontal')).toBeTruthy();
      expect(grid.hasClass('euiDataGrid--fontSizeSmall')).toBeTruthy();
      expect(grid.hasClass('euiDataGrid--paddingLarge')).toBeTruthy();
      expect(grid.hasClass('euiDataGrid--rowHoverHighlight')).toBeTruthy();
      expect(grid.hasClass('euiDataGrid--headerUnderline')).toBeTruthy();
      expect(grid.hasClass('euiDataGrid--stripes')).toBeTruthy();
    });
    it('should render the grid with style override if gridStyleOverride is provided', async () => {
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
    });
  });

  describe('rowLineHeightOverride', () => {
    it('should render the grid with the default row line height if no rowLineHeightOverride is provided', async () => {
      const component = await getComponent({
        ...getProps(),
      });

      const gridRowCell = findTestSubject(component, 'dataGridRowCell').first();
      expect(gridRowCell.prop('style')).toMatchObject({
        lineHeight: '1.6em',
      });
    });
    it('should render the grid with row line height override if rowLineHeightOverride is provided', async () => {
      const component = await getComponent({
        ...getProps(),
        rowLineHeightOverride: '24px',
      });

      const gridRowCell = findTestSubject(component, 'dataGridRowCell').first();
      expect(gridRowCell.prop('style')).toMatchObject({
        lineHeight: '24px',
      });
    });
  });

  describe('document comparison', () => {
    const renderDataTable = (props: Partial<UnifiedDataTableProps>) => {
      render(
        <IntlProvider locale="en">
          <DataTable {...props} />
        </IntlProvider>
      );
    };

    const getSelectedDocumentsButton = () => screen.queryByTestId('unifiedDataTableSelectionBtn');

    const selectDocument = (document: EsHitRecord) =>
      userEvent.click(screen.getByTestId(`dscGridSelectDoc-${getDocId(document)}`));

    const openSelectedRowsMenu = async () => {
      userEvent.click(await screen.findByTestId('unifiedDataTableSelectionBtn'));
      await screen.findAllByText('Clear selection');
    };

    const closeSelectedRowsMenu = async () => {
      userEvent.click(await screen.findByTestId('unifiedDataTableSelectionBtn'));
    };

    const getCompareDocumentsButton = () =>
      screen.queryByTestId('unifiedDataTableCompareSelectedDocuments');

    const goToComparisonMode = async () => {
      selectDocument(esHitsMock[0]);
      selectDocument(esHitsMock[1]);
      await openSelectedRowsMenu();
      userEvent.click(await screen.findByTestId('unifiedDataTableCompareSelectedDocuments'));
      await screen.findByText('Comparing 2 documents');
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

    it('should not allow comparison if less than 2 documents are selected', async () => {
      renderDataTable({ enableComparisonMode: true });
      expect(getSelectedDocumentsButton()).not.toBeInTheDocument();
      selectDocument(esHitsMock[0]);
      expect(getSelectedDocumentsButton()).toBeInTheDocument();
      await openSelectedRowsMenu();
      expect(getCompareDocumentsButton()).not.toBeInTheDocument();
      await closeSelectedRowsMenu();
      selectDocument(esHitsMock[1]);
      expect(getSelectedDocumentsButton()).toBeInTheDocument();
      await openSelectedRowsMenu();
      expect(getCompareDocumentsButton()).toBeInTheDocument();
      await closeSelectedRowsMenu();
    });

    it('should not allow comparison if comparison mode is disabled', async () => {
      renderDataTable({ enableComparisonMode: false });
      selectDocument(esHitsMock[0]);
      selectDocument(esHitsMock[1]);
      await openSelectedRowsMenu();
      expect(getCompareDocumentsButton()).not.toBeInTheDocument();
      await closeSelectedRowsMenu();
    });

    it('should allow comparison if 2 or more documents are selected and comparison mode is enabled', async () => {
      renderDataTable({ enableComparisonMode: true });
      await goToComparisonMode();
      expect(getColumnHeaders()).toEqual(['Field', '1', '2']);
      expect(getCellValues()).toEqual(['', '', 'i', 'i', '20', '', '', 'jpg', 'test1', '']);
    });

    it('should show full screen button if showFullScreenButton is true', async () => {
      renderDataTable({ enableComparisonMode: true, showFullScreenButton: true });
      await goToComparisonMode();
      expect(getFullScreenButton()).toBeInTheDocument();
    });

    it('should hide full screen button if showFullScreenButton is false', async () => {
      renderDataTable({ enableComparisonMode: true, showFullScreenButton: false });
      await goToComparisonMode();
      expect(getFullScreenButton()).not.toBeInTheDocument();
    });

    it('should render selected fields', async () => {
      const columns = ['bytes', 'message'];
      renderDataTable({ enableComparisonMode: true, columns });
      await goToComparisonMode();
      expect(getFieldColumns()).toEqual(['@timestamp', ...columns]);
    });

    it('should render all available fields if no fields are selected', async () => {
      renderDataTable({ enableComparisonMode: true });
      await goToComparisonMode();
      expect(getFieldColumns()).toEqual(['@timestamp', '_index', 'bytes', 'extension', 'message']);
    });
  });

  describe('getRowIndicator', () => {
    it('should render the color indicator control', async () => {
      const component = await getComponent({
        ...getProps(),
        getRowIndicator: jest.fn(() => ({ color: 'blue', label: 'test' })),
      });

      expect(findTestSubject(component, 'dataGridHeaderCell-colorIndicator').exists()).toBeTruthy();
      expect(
        findTestSubject(component, 'unifiedDataTableRowColorIndicatorCell').first().prop('title')
      ).toEqual('test');
    });

    it('should not render the color indicator control by default', async () => {
      const component = await getComponent({
        ...getProps(),
        getRowIndicator: undefined,
      });

      expect(findTestSubject(component, 'dataGridHeaderCell-colorIndicator').exists()).toBeFalsy();
    });
  });
});
