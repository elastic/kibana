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
import { esHits } from '../../__mocks__/es_hits';
import { indexPatternMock } from '../../__mocks__/index_pattern';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { DiscoverGrid, DiscoverGridProps } from './discover_grid';
import { getDocId } from './discover_grid_document_selection';
import { ElasticSearchHit } from '../../types';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { discoverServiceMock } from '../../__mocks__/services';

function getProps() {
  return {
    ariaLabelledBy: '',
    columns: [],
    indexPattern: indexPatternMock,
    isLoading: false,
    expandedDoc: undefined,
    onAddColumn: jest.fn(),
    onFilter: jest.fn(),
    onRemoveColumn: jest.fn(),
    onResize: jest.fn(),
    onSetColumns: jest.fn(),
    onSort: jest.fn(),
    rows: esHits,
    sampleSize: 30,
    searchDescription: '',
    searchTitle: '',
    setExpandedDoc: jest.fn(),
    settings: {},
    showTimeCol: true,
    sort: [],
    useNewFieldsApi: true,
  };
}

function getComponent() {
  const Proxy = (props: DiscoverGridProps) => (
    <KibanaContextProvider services={discoverServiceMock}>
      <DiscoverGrid {...props} />
    </KibanaContextProvider>
  );

  return mountWithIntl(<Proxy {...getProps()} />);
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
  document: ElasticSearchHit
) {
  act(() => {
    const docId = getDocId(document);
    findTestSubject(component, `dscGridSelectDoc-${docId}`).simulate('change');
  });
  component.update();
}

describe('DiscoverGrid', () => {
  describe('Document selection', () => {
    let component: ReactWrapper<DiscoverGridProps>;
    beforeEach(() => {
      component = getComponent();
    });

    test('no documents are selected initially', async () => {
      expect(getSelectedDocNr(component)).toBe(0);
      expect(getDisplayedDocNr(component)).toBe(5);
    });

    test('Allows selection/deselection of multiple documents', async () => {
      await toggleDocSelection(component, esHits[0]);
      expect(getSelectedDocNr(component)).toBe(1);
      await toggleDocSelection(component, esHits[1]);
      expect(getSelectedDocNr(component)).toBe(2);
      await toggleDocSelection(component, esHits[1]);
      expect(getSelectedDocNr(component)).toBe(1);
    });

    test('deselection of all selected documents', async () => {
      await toggleDocSelection(component, esHits[0]);
      await toggleDocSelection(component, esHits[1]);
      expect(getSelectedDocNr(component)).toBe(2);
      findTestSubject(component, 'dscGridSelectionBtn').simulate('click');
      findTestSubject(component, 'dscGridClearSelectedDocuments').simulate('click');
      expect(getSelectedDocNr(component)).toBe(0);
    });

    test('showing only selected documents and undo selection', async () => {
      await toggleDocSelection(component, esHits[0]);
      await toggleDocSelection(component, esHits[1]);
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
      await toggleDocSelection(component, esHits[0]);
      await toggleDocSelection(component, esHits[1]);
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
        ],
      });
      expect(getDisplayedDocNr(component)).toBe(1);
      expect(getSelectedDocNr(component)).toBe(0);
    });

    test('showing only selected documents and remove filter deselecting each doc manually', async () => {
      await toggleDocSelection(component, esHits[0]);
      findTestSubject(component, 'dscGridSelectionBtn').simulate('click');
      findTestSubject(component, 'dscGridShowSelectedDocuments').simulate('click');
      expect(getDisplayedDocNr(component)).toBe(1);
      await toggleDocSelection(component, esHits[0]);
      expect(getDisplayedDocNr(component)).toBe(5);
      await toggleDocSelection(component, esHits[0]);
      expect(getDisplayedDocNr(component)).toBe(5);
    });

    test('copying selected documents to clipboard', async () => {
      await toggleDocSelection(component, esHits[0]);
      findTestSubject(component, 'dscGridSelectionBtn').simulate('click');
      expect(component.find(EuiCopy).prop('textToCopy')).toMatchInlineSnapshot(
        `"[{\\"_index\\":\\"i\\",\\"_id\\":\\"1\\",\\"_score\\":1,\\"_type\\":\\"_doc\\",\\"_source\\":{\\"date\\":\\"2020-20-01T12:12:12.123\\",\\"message\\":\\"test1\\",\\"bytes\\":20}}]"`
      );
    });
  });
});
