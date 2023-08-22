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
  EuiCopy,
  EuiDataGridCellValueElementProps,
  EuiDataGridCustomBodyProps,
} from '@elastic/eui';
import { act } from 'react-dom/test-utils';
import { findTestSubject } from '@elastic/eui/lib/test';
import { buildDataViewMock, deepMockedFields, esHitsMock } from '@kbn/discover-utils/src/__mocks__';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { DataLoadingState, UnifiedDataTable, UnifiedDataTableProps } from './data_table';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { servicesMock } from '../../__mocks__/services';
import { buildDataTableRecord, getDocId } from '@kbn/discover-utils';
import type { DataTableRecord, EsHitRecord } from '@kbn/discover-utils/types';
import { testLeadingControlColumn } from '../../__mocks__/external_control_columns';

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
    sampleSize: 30,
    searchDescription: '',
    searchTitle: '',
    setExpandedDoc: jest.fn(),
    settings: {},
    showTimeCol: true,
    sort: [],
    useNewFieldsApi: true,
    services: {
      fieldFormats: services.fieldFormats,
      addBasePath: jest.fn(),
      uiSettings: services.uiSettings,
      dataViewFieldEditor: services.dataViewFieldEditor,
      toastNotifications: services.toastNotifications,
      storage: services.storage,
      data: services.data,
      theme: services.theme,
    },
  };
}

async function getComponent(props: UnifiedDataTableProps = getProps()) {
  const Proxy = (innerProps: UnifiedDataTableProps) => (
    <KibanaContextProvider services={servicesMock}>
      <UnifiedDataTable {...innerProps} />
    </KibanaContextProvider>
  );

  const component = mountWithIntl(<Proxy {...props} />);
  await act(async () => {
    // needed by cell actions to complete async loading
    component.update();
  });
  return component;
}

function getSelectedDocNr(component: ReactWrapper<UnifiedDataTableProps>) {
  const gridSelectionBtn = findTestSubject(component, 'dscGridSelectionBtn');
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
      findTestSubject(component, 'dscGridSelectionBtn').simulate('click');
      findTestSubject(component, 'dscGridClearSelectedDocuments').simulate('click');
      expect(getSelectedDocNr(component)).toBe(0);
    });

    test('showing only selected documents and undo selection', async () => {
      await toggleDocSelection(component, esHitsMock[0]);
      await toggleDocSelection(component, esHitsMock[1]);
      expect(getSelectedDocNr(component)).toBe(2);
      findTestSubject(component, 'dscGridSelectionBtn').simulate('click');
      findTestSubject(component, 'dscGridShowSelectedDocuments').simulate('click');
      expect(getDisplayedDocNr(component)).toBe(2);
      findTestSubject(component, 'dscGridSelectionBtn').simulate('click');
      component.update();
      findTestSubject(component, 'dscGridShowAllDocuments').simulate('click');
      expect(getDisplayedDocNr(component)).toBe(5);
    });

    test('showing selected documents, underlying data changes, all documents are displayed, selection is gone', async () => {
      await toggleDocSelection(component, esHitsMock[0]);
      await toggleDocSelection(component, esHitsMock[1]);
      expect(getSelectedDocNr(component)).toBe(2);
      findTestSubject(component, 'dscGridSelectionBtn').simulate('click');
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
      findTestSubject(component, 'dscGridSelectionBtn').simulate('click');
      findTestSubject(component, 'dscGridShowSelectedDocuments').simulate('click');
      expect(getDisplayedDocNr(component)).toBe(1);
      await toggleDocSelection(component, esHitsMock[0]);
      expect(getDisplayedDocNr(component)).toBe(5);
      await toggleDocSelection(component, esHitsMock[0]);
      expect(getDisplayedDocNr(component)).toBe(5);
    });

    test('copying selected documents to clipboard', async () => {
      await toggleDocSelection(component, esHitsMock[0]);
      findTestSubject(component, 'dscGridSelectionBtn').simulate('click');
      expect(component.find(EuiCopy).prop('textToCopy')).toMatchInlineSnapshot(
        `"[{\\"_index\\":\\"i\\",\\"_id\\":\\"1\\",\\"_score\\":1,\\"_type\\":\\"_doc\\",\\"_source\\":{\\"date\\":\\"2020-20-01T12:12:12.123\\",\\"message\\":\\"test1\\",\\"bytes\\":20}}]"`
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
      expect(mockUseDataGridColumnsCellActions).toHaveBeenCalledWith(
        expect.objectContaining({
          triggerId: undefined,
          getCellValue: expect.any(Function),
          fields: undefined,
        })
      );
    });

    it('should call useDataGridColumnsCellActions properly when cellActionsTriggerId defined', async () => {
      await getComponent({
        ...getProps(),
        columns: ['message'],
        onFieldEdited: jest.fn(),
        cellActionsTriggerId: 'test',
      });
      expect(mockUseDataGridColumnsCellActions).toHaveBeenCalledWith(
        expect.objectContaining({
          triggerId: 'test',
          getCellValue: expect.any(Function),
          fields: [
            dataViewMock.getFieldByName('@timestamp')?.toSpec(),
            dataViewMock.getFieldByName('message')?.toSpec(),
          ],
        })
      );
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
      renderDocumentView: (
        hit: DataTableRecord,
        displayedRows: DataTableRecord[],
        displayedColumns: string[]
      ) => <div data-test-subj="test-document-view">{hit.id}</div>,
      externalControlColumns: [testLeadingControlColumn],
    });

    findTestSubject(component, 'docTableExpandToggleColumn').first().simulate('click');
    expect(findTestSubject(component, 'test-document-view').exists()).toBeTruthy();
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
});
