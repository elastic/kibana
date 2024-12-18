/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import '@kbn/code-editor-mock/jest_helper';
import { DocViewerSource } from './source';
import * as hooks from '../../hooks/use_es_doc_search';
import * as useUiSettingHook from '@kbn/kibana-react-plugin/public/ui_settings/use_ui_setting';
import { EuiButton, EuiEmptyPrompt, EuiLoadingSpinner } from '@elastic/eui';
import { JsonCodeEditorCommon } from '../json_code_editor';
import { buildDataTableRecord } from '@kbn/discover-utils';

const mockDataView = {
  getComputedFields: () => [],
} as never;

describe('Source Viewer component', () => {
  test('renders loading state', () => {
    jest.spyOn(hooks, 'useEsDocSearch').mockImplementation(() => [0, null, () => {}]);

    const comp = mountWithIntl(
      <DocViewerSource
        id={'1'}
        index={'index1'}
        dataView={mockDataView}
        width={123}
        hasLineNumbers={true}
        onRefresh={() => {}}
      />
    );
    const loadingIndicator = comp.find(EuiLoadingSpinner);
    expect(loadingIndicator).not.toBe(null);
  });

  test('renders error state', () => {
    jest.spyOn(hooks, 'useEsDocSearch').mockImplementation(() => [3, null, () => {}]);

    const comp = mountWithIntl(
      <DocViewerSource
        id={'1'}
        index={'index1'}
        dataView={mockDataView}
        width={123}
        hasLineNumbers={true}
        onRefresh={() => {}}
      />
    );
    const errorPrompt = comp.find(EuiEmptyPrompt);
    expect(errorPrompt.length).toBe(1);
    const refreshButton = comp.find(EuiButton);
    expect(refreshButton.length).toBe(1);
  });

  test('renders json code editor', () => {
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
    jest.spyOn(hooks, 'useEsDocSearch').mockImplementation(() => [2, mockHit, () => {}]);
    jest.spyOn(useUiSettingHook, 'useUiSetting').mockImplementation(() => {
      return false;
    });
    const comp = mountWithIntl(
      <DocViewerSource
        id={'1'}
        index={'index1'}
        dataView={mockDataView}
        width={123}
        hasLineNumbers={true}
        onRefresh={() => {}}
      />
    );
    const jsonCodeEditor = comp.find(JsonCodeEditorCommon);
    expect(jsonCodeEditor).not.toBe(null);
    expect(jsonCodeEditor.props().jsonValue).toContain('_source');
    expect(jsonCodeEditor.props().jsonValue).not.toContain('_score');
  });
});
