/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import type { DataView } from '@kbn/data-views-plugin/public';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { DocViewerSource } from './source';
import * as hooks from '../../../../utils/use_es_doc_search';
import * as useUiSettingHook from '@kbn/kibana-react-plugin/public/ui_settings/use_ui_setting';
import { EuiButton, EuiEmptyPrompt, EuiLoadingSpinner } from '@elastic/eui';
import { JsonCodeEditorCommon } from '../../../../components/json_code_editor/json_code_editor_common';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

const mockIndexPattern = {
  getComputedFields: () => [],
} as never;
const getMock = jest.fn(() => Promise.resolve(mockIndexPattern));
const mockIndexPatternService = {
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
    indexPatternService: mockIndexPatternService,
  },
};

describe('Source Viewer component', () => {
  test('renders loading state', () => {
    jest.spyOn(hooks, 'useEsDocSearch').mockImplementation(() => [0, null, () => {}]);

    const comp = mountWithIntl(
      <KibanaContextProvider services={services}>
        <DocViewerSource
          id={'1'}
          index={'index1'}
          indexPattern={mockIndexPattern}
          width={123}
          hasLineNumbers={true}
        />
      </KibanaContextProvider>
    );
    expect(comp.children()).toMatchSnapshot();
    const loadingIndicator = comp.find(EuiLoadingSpinner);
    expect(loadingIndicator).not.toBe(null);
  });

  test('renders error state', () => {
    jest.spyOn(hooks, 'useEsDocSearch').mockImplementation(() => [3, null, () => {}]);

    const comp = mountWithIntl(
      <KibanaContextProvider services={services}>
        <DocViewerSource
          id={'1'}
          index={'index1'}
          indexPattern={mockIndexPattern}
          width={123}
          hasLineNumbers={true}
        />
      </KibanaContextProvider>
    );
    expect(comp.children()).toMatchSnapshot();
    const errorPrompt = comp.find(EuiEmptyPrompt);
    expect(errorPrompt.length).toBe(1);
    const refreshButton = comp.find(EuiButton);
    expect(refreshButton.length).toBe(1);
  });

  test('renders json code editor', () => {
    const mockHit = {
      _index: 'logstash-2014.09.09',
      _type: 'doc',
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
    } as never;
    jest.spyOn(hooks, 'useEsDocSearch').mockImplementation(() => [2, mockHit, () => {}]);
    jest.spyOn(useUiSettingHook, 'useUiSetting').mockImplementation(() => {
      return false;
    });
    const comp = mountWithIntl(
      <KibanaContextProvider services={services}>
        <DocViewerSource
          id={'1'}
          index={'index1'}
          indexPattern={mockIndexPattern}
          width={123}
          hasLineNumbers={true}
        />
      </KibanaContextProvider>
    );
    expect(comp.children()).toMatchSnapshot();
    const jsonCodeEditor = comp.find(JsonCodeEditorCommon);
    expect(jsonCodeEditor).not.toBe(null);
  });
});
