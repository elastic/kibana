/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { act } from 'react-dom/test-utils';
import { findTestSubject } from '@elastic/eui/lib/test';
import { esHits } from '../../../__mocks__/es_hits';
import { indexPatternMock } from '../../../__mocks__/index_pattern';
import { mountWithIntl } from '@kbn/test/jest';
import { DiscoverGrid } from './discover_grid';
import { uiSettingsMock } from '../../../__mocks__/ui_settings';
import { DiscoverServices } from '../../../build_services';
import { getDocId } from './discover_grid_columns';

describe('DiscoverGrid', () => {
  test('selecting documents', async () => {
    const servicesMock = {
      uiSettings: uiSettingsMock,
    } as DiscoverServices;
    const props = {
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
      services: servicesMock,
      setExpandedDoc: jest.fn(),
      settings: {},
      showTimeCol: true,
      sort: [],
      useNewFieldsApi: true,
    };

    const component = mountWithIntl(<DiscoverGrid {...props} />);
    expect(findTestSubject(component, 'dscGridSelectionBtn').length).toBe(0);

    act(() => {
      const docId = getDocId(esHits[0]);
      expect(findTestSubject(component, `dscGridSelectDoc-${docId}`).length).toBe(1);
      findTestSubject(component, `dscGridSelectDoc-${docId}`).simulate('change');
    });
    component.update();
    expect(findTestSubject(component, 'dscGridSelectionBtn').length).toBe(1);

    act(() => {
      const docId = getDocId(esHits[1]);
      expect(findTestSubject(component, `dscGridSelectDoc-${docId}`).length).toBe(1);
      findTestSubject(component, `dscGridSelectDoc-${docId}`).simulate('change');
    });
    component.update();
    expect(findTestSubject(component, 'dscGridSelectionBtn').length).toBe(1);
    const selectedNr = findTestSubject(component, 'dscGridSelectionBtn')
      .getDOMNode()
      .getAttribute('data-selected-documents');
    expect(selectedNr).toBe('2');

    act(() => {
      const docId = getDocId(esHits[1]);
      expect(findTestSubject(component, `dscGridSelectDoc-${docId}`).length).toBe(1);
      findTestSubject(component, `dscGridSelectDoc-${docId}`).simulate('change');
    });
    component.update();
    expect(findTestSubject(component, 'dscGridSelectionBtn').length).toBe(1);
    const selectedNr2 = findTestSubject(component, 'dscGridSelectionBtn')
      .getDOMNode()
      .getAttribute('data-selected-documents');
    expect(selectedNr2).toBe('1');
  });
});
