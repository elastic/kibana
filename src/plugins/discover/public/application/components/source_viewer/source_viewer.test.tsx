/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test/jest';
import { SourceViewer } from './source_viewer';
import { DocProps } from '../doc/doc';
import * as hooks from '../doc/use_es_doc_search';
import { EuiEmptyPrompt, EuiLoadingSpinner } from '@elastic/eui';
import { JsonCodeEditorCommon } from '../json_code_editor/json_code_editor_common';

jest.mock('src/plugins/kibana_react/public/ui_settings');

describe('Source Viewer component', () => {
  const mockIndexPattern = {
    getComputedFields: () => [],
  } as never;
  const indexPatternService = {
    get: jest.fn(() => Promise.resolve(mockIndexPattern)),
  } as never;

  const props = {
    id: '1',
    index: 'index1',
    indexPatternId: 'xyz',
    indexPatternService,
  } as DocProps;

  test('renders loading state', () => {
    jest.spyOn(hooks, 'useEsDocSearch').mockImplementation(() => [0, null, null]);

    const comp = mountWithIntl(<SourceViewer docProps={props} width={123} hasLineNumbers={true} />);
    expect(comp).toMatchSnapshot();
    const loadingIndicator = comp.find(EuiLoadingSpinner);
    expect(loadingIndicator).not.toBe(null);
  });

  test('renders error state', () => {
    jest.spyOn(hooks, 'useEsDocSearch').mockImplementation(() => [3, null, null]);

    const comp = mountWithIntl(<SourceViewer docProps={props} width={123} hasLineNumbers={true} />);
    expect(comp).toMatchSnapshot();
    const errorPrompt = comp.find(EuiEmptyPrompt);
    expect(errorPrompt).not.toBe(null);
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
    jest.spyOn(hooks, 'useEsDocSearch').mockImplementation(() => [2, mockHit, mockIndexPattern]);
    const comp = mountWithIntl(<SourceViewer docProps={props} width={123} hasLineNumbers={true} />);
    expect(comp).toMatchSnapshot();
    const jsonCodeEditor = comp.find(JsonCodeEditorCommon);
    expect(jsonCodeEditor).not.toBe(null);
  });
});
