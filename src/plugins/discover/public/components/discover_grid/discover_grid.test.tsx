/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { ReactWrapper } from 'enzyme';
import { EuiCopy } from '@elastic/eui';
import { act } from 'react-dom/test-utils';
import { findTestSubject } from '@elastic/eui/lib/test';
import { buildDataViewMock, deepMockedFields, esHitsMock } from '@kbn/discover-utils/src/__mocks__';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { DiscoverGrid, DiscoverGridProps, DataLoadingState } from './discover_grid';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { discoverServiceMock } from '../../__mocks__/services';
import { buildDataTableRecord, getDocId } from '@kbn/discover-utils';
import type { EsHitRecord } from '@kbn/discover-utils/types';

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

function getProps() {
  const services = discoverServiceMock;
  services.dataViewFieldEditor.userPermissions.editIndexPattern = jest.fn().mockReturnValue(true);

  return {
    ariaLabelledBy: '',
    columns: [],
    dataView: dataViewMock,
    loadingState: DataLoadingState.loaded,
    expandedDoc: undefined,
    onAddColumn: jest.fn(),
    onFilter: jest.fn(),
    onRemoveColumn: jest.fn(),
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
    services,
  };
}

async function getComponent(props: DiscoverGridProps = getProps()) {
  const Proxy = (innerProps: DiscoverGridProps) => (
    <KibanaContextProvider services={discoverServiceMock}>
      <DiscoverGrid {...innerProps} />
    </KibanaContextProvider>
  );

  const component = mountWithIntl(<Proxy {...props} />);
  await act(async () => {
    // needed by cell actions to complete async loading
    component.update();
  });
  return component;
}

function getSelectedDocNr(component: ReactWrapper<DiscoverGridProps>) {
  const gridSelectionBtn = findTestSubject(component, 'dscGridSelectionBtn');
  if (!gridSelectionBtn.length) {
    return 0;
  }
  const selectedNr = gridSelectionBtn.getDOMNode().getAttribute('data-selected-documents');
  return Number(selectedNr);
}

function getDisplayedDocNr(component: ReactWrapper<DiscoverGridProps>) {
  const gridSelectionBtn = findTestSubject(component, 'discoverDocTable');
  if (!gridSelectionBtn.length) {
    return 0;
  }
  const selectedNr = gridSelectionBtn.getDOMNode().getAttribute('data-document-number');
  return Number(selectedNr);
}

async function toggleDocSelection(
  component: ReactWrapper<DiscoverGridProps>,
  document: EsHitRecord
) {
  act(() => {
    const docId = getDocId(document);
    findTestSubject(component, `dscGridSelectDoc-${docId}`).simulate('change');
  });
  component.update();
}

describe('DiscoverGrid', () => {
  afterEach(async () => {
    jest.clearAllMocks();
  });

  describe('Document selection', () => {
    let component: ReactWrapper<DiscoverGridProps>;
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
});
