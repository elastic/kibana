/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import '@testing-library/jest-dom';
import '@kbn/code-editor-mock/jest_helper';
import React from 'react';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { DocViewerSource } from './source';
import { ElasticRequestState } from '@kbn/unified-doc-viewer';
import { JSONCodeEditorCommonMemoized } from '../json_code_editor';
import { mockUnifiedDocViewerServices } from '../../__mocks__';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';
import { setUnifiedDocViewerServices } from '../../plugin';
import { useEsDocSearch } from '../../hooks/use_es_doc_search';

jest.mock('../../hooks/use_es_doc_search', () => ({
  useEsDocSearch: jest.fn(),
}));

jest.mock('../json_code_editor', () => ({
  JSONCodeEditorCommonMemoized: jest.fn(() => <div>JSON code editor</div>),
}));

setUnifiedDocViewerServices(mockUnifiedDocViewerServices);

const mockUseEsDocSearch = jest.mocked(useEsDocSearch);

const mockJSONCodeEditorCommonMemoized = jest.mocked(JSONCodeEditorCommonMemoized);

const getJsonCodeEditorProps = () => mockJSONCodeEditorCommonMemoized.mock.calls[0][0];

const defaultProps = {
  dataView: dataViewMock,
  id: '1',
  index: 'index1',
  onRefresh: () => {},
  width: 123,
};

describe('Source Viewer component', () => {
  beforeEach(() => {
    mockUseEsDocSearch.mockReset();
    mockJSONCodeEditorCommonMemoized.mockClear();
  });

  it('renders loading state', () => {
    mockUseEsDocSearch.mockReturnValue([ElasticRequestState.Loading, null, () => {}]);

    renderWithI18n(<DocViewerSource {...defaultProps} />);

    expect(screen.getByText('Loading JSON')).toBeVisible();
    expect(screen.getByRole('progressbar')).toBeVisible();
  });

  it('renders error state', () => {
    mockUseEsDocSearch.mockReturnValue([ElasticRequestState.Error, null, () => {}]);

    renderWithI18n(<DocViewerSource {...defaultProps} />);

    expect(screen.getByText('An Error Occurred')).toBeVisible();
    expect(
      screen.getByText('Could not fetch data at this time. Refresh the tab to try again.')
    ).toBeVisible();
    expect(screen.getByText('Refresh')).toBeVisible();
  });

  it('renders json code editor', async () => {
    const mockHit = buildDataTableRecord({
      _index: 'logstash-2014.09.09',
      _id: 'id123',
      _score: 1,
      _source: {
        message: 'Lorem ipsum dolor sit amet',
        extension: 'html',
        not_mapped: 'yes',
        bytes: 100,
        objectArray: [{ foo: true }],
        relatedContent: {
          test: 1,
        },
        scripted: 123,
        _underscore: 123,
      },
    });
    mockUseEsDocSearch.mockReturnValue([ElasticRequestState.Found, mockHit, () => {}]);

    renderWithI18n(<DocViewerSource {...defaultProps} />);

    expect(await screen.findByText('JSON code editor')).toBeVisible();

    const { enableFindAction, hasLineNumbers, jsonValue } = getJsonCodeEditorProps();

    expect(hasLineNumbers).toBe(true);
    expect(enableFindAction).toBe(true);
    expect(jsonValue).toContain('_source');
    expect(jsonValue).not.toContain('_score');
  });

  it('renders json code editor for ES|QL record', async () => {
    const record = {
      _index: 'logstash-2014.09.09',
      _id: 'id123',
      message: 'Lorem ipsum dolor sit amet',
      extension: 'html',
    };
    const mockHit = {
      id: '22',
      raw: record,
      flattened: record,
    };

    mockUseEsDocSearch.mockReturnValue([ElasticRequestState.Found, mockHit, () => {}]);

    renderWithI18n(<DocViewerSource {...defaultProps} id={mockHit.id} esqlHit={mockHit} />);

    expect(await screen.findByText('JSON code editor')).toBeVisible();

    const { jsonValue } = getJsonCodeEditorProps();
    expect(jsonValue).toContain('message');
    expect(jsonValue).toContain('_id');
  });
});
