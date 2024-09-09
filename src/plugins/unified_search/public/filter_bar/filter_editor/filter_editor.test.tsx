/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { UseEuiTheme, EuiThemeComputed } from '@elastic/eui';
import { registerTestBed, TestBed } from '@kbn/test-jest-helpers';
import { coreMock } from '@kbn/core/public/mocks';
import type { FilterEditorProps } from '.';
import { FilterEditor } from '.';
import { dataViewMockList } from '../../dataview_picker/mocks/dataview';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';

const dataMock = dataPluginMock.createStartContract();
jest.mock('@kbn/code-editor', () => {
  const original = jest.requireActual('@kbn/code-editor');

  return {
    ...original,
    CodeEditor: (props: any) => (
      <input
        data-test-subj={props['data-test-subj'] || 'mockCodeEditor'}
        value={props.value}
        onChange={async (eve: any) => {
          props.onChange(eve.target.value);
        }}
      />
    ),
  };
});

describe('<FilterEditor />', () => {
  describe('writing query dsl', () => {
    let testBed: TestBed;

    beforeEach(async () => {
      const defaultProps: Omit<FilterEditorProps, 'intl'> = {
        theme: {
          euiTheme: {} as unknown as EuiThemeComputed<{}>,
          colorMode: 'DARK',
          modifications: [],
        } as UseEuiTheme<{}>,
        filter: {
          meta: {
            type: 'phase',
          } as any,
        },
        indexPatterns: [],
        onCancel: jest.fn(),
        onSubmit: jest.fn(),
        docLinks: coreMock.createStart().docLinks,
        dataViews: dataMock.dataViews,
      };
      testBed = await registerTestBed(FilterEditor, { defaultProps })();
    });

    it('requires a non-empty JSON object', async () => {
      const { exists, find } = testBed;

      expect(exists('customEditorInput')).toBe(true);

      find('customEditorInput').simulate('change', {
        target: { value: '{ }' },
      });
      expect(find('saveFilter').props().disabled).toBe(true);

      find('customEditorInput').simulate('change', {
        target: { value: '{' }, // bad JSON
      });
      expect(find('saveFilter').props().disabled).toBe(true);

      find('customEditorInput').simulate('change', {
        target: { value: '{ "something": "here" }' },
      });

      expect(find('saveFilter').props().disabled).toBe(false);
    });
  });
  describe('handling data view fallback', () => {
    let testBed: TestBed;

    beforeEach(async () => {
      dataMock.dataViews.get = jest.fn().mockReturnValue(Promise.resolve(dataViewMockList[1]));
      const defaultProps: Omit<FilterEditorProps, 'intl'> = {
        theme: {
          euiTheme: {} as unknown as EuiThemeComputed<{}>,
          colorMode: 'DARK',
          modifications: [],
        } as UseEuiTheme<{}>,
        filter: {
          meta: {
            type: 'phase',
            index: dataViewMockList[1].id,
          } as any,
        },
        indexPatterns: [dataViewMockList[0]],
        onCancel: jest.fn(),
        onSubmit: jest.fn(),
        docLinks: coreMock.createStart().docLinks,
        dataViews: dataMock.dataViews,
      };
      testBed = await registerTestBed(FilterEditor, { defaultProps })();
    });

    it('renders the right data view to be selected', async () => {
      const { exists, component, find } = testBed;
      component.update();
      expect(exists('filterIndexPatternsSelect')).toBe(true);
      expect(find('filterIndexPatternsSelect').find('input').props().value).toBe(
        dataViewMockList[1].getName()
      );
    });
  });
  describe('UI renders when data view fallback promise is rejected', () => {
    let testBed: TestBed;

    beforeEach(async () => {
      dataMock.dataViews.get = jest.fn().mockReturnValue(Promise.reject());
      const defaultProps: Omit<FilterEditorProps, 'intl'> = {
        theme: {
          euiTheme: {} as unknown as EuiThemeComputed<{}>,
          colorMode: 'DARK',
          modifications: [],
        } as UseEuiTheme<{}>,
        filter: {
          meta: {
            type: 'phase',
            index: dataViewMockList[1].id,
          } as any,
        },
        indexPatterns: [dataViewMockList[0]],
        onCancel: jest.fn(),
        onSubmit: jest.fn(),
        docLinks: coreMock.createStart().docLinks,
        dataViews: dataMock.dataViews,
      };
      testBed = registerTestBed(FilterEditor, { defaultProps })();
    });

    it('renders the right data view to be selected', async () => {
      const { exists, component, find } = await testBed;
      component.update();
      expect(exists('filterIndexPatternsSelect')).toBe(true);
      expect(find('filterIndexPatternsSelect').find('input').props().value).toBe('');
    });
  });
});
