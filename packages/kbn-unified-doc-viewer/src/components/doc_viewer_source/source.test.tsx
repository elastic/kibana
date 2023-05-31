/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { EuiButton, EuiEmptyPrompt, EuiLoadingSpinner } from '@elastic/eui';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import * as useUiSettingHook from '@kbn/kibana-react-plugin/public/ui_settings/use_ui_setting';
import { CodeEditor, KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { buildDataTableRecord, EsHitRecord } from '@kbn/unified-discover';
import { ElasticRequestState, JsonCodeEditorCommon } from '../..';
import { DocViewerSource } from './source';

const mockDataView = {
  getComputedFields: () => [],
} as never;
const getMock = jest.fn(() => Promise.resolve(mockDataView));
const mockDataViewService = {
  get: getMock,
} as unknown as DataView;
const services = {
  uiSettings: {
    get: (key: string) => {
      if (key === 'discover:useNewFieldsApi') {
        return true;
      }
    },
  },
  data: {
    dataViewService: mockDataViewService,
  },
};

describe('Source Viewer component', () => {
  test('renders loading state', () => {
    const comp = mountWithIntl(
      <KibanaContextProvider services={services}>
        <DocViewerSource
          CodeEditor={CodeEditor}
          width={123}
          hasLineNumbers={true}
          useDocExplorer={false}
          requestState={ElasticRequestState.Loading}
          hit={null}
          onRefresh={() => {}}
        />
      </KibanaContextProvider>
    );
    const loadingIndicator = comp.find(EuiLoadingSpinner);
    expect(loadingIndicator).not.toBe(null);
  });

  test('renders error state', () => {
    const comp = mountWithIntl(
      <KibanaContextProvider services={services}>
        <DocViewerSource
          CodeEditor={CodeEditor}
          width={123}
          hasLineNumbers={true}
          useDocExplorer={false}
          requestState={ElasticRequestState.Error}
          hit={null}
          onRefresh={() => {}}
        />
      </KibanaContextProvider>
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
    jest.spyOn(useUiSettingHook, 'useUiSetting').mockImplementation(() => {
      return false;
    });
    const comp = mountWithIntl(
      <KibanaContextProvider services={services}>
        <DocViewerSource
          CodeEditor={CodeEditor}
          width={123}
          hasLineNumbers={true}
          useDocExplorer={false}
          requestState={ElasticRequestState.Found}
          hit={mockHit as unknown as EsHitRecord}
          onRefresh={() => {}}
        />
      </KibanaContextProvider>
    );
    const jsonCodeEditor = comp.find(JsonCodeEditorCommon);
    expect(jsonCodeEditor).not.toBe(null);
  });
});
