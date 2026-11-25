/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type ComponentProps } from 'react';
import { act } from '@testing-library/react';
import type { UseEuiTheme, EuiThemeComputed } from '@elastic/eui';
import type { TestBed } from '@kbn/test-jest-helpers';
import { registerTestBed } from '@kbn/test-jest-helpers';
import { coreMock } from '@kbn/core/public/mocks';
import { FilterStateStore } from '@kbn/es-query';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/public';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { createNestedDataView } from './lib/nested_data_view.mock';
import type { FilterEditorProps } from '.';
import { FilterEditor } from '.';
import type { DataView } from '@kbn/data-views-plugin/common';
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
          highContrastMode: false,
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
  describe('submitting query dsl with no index patterns', () => {
    it('should create filter when no index patterns are available', async () => {
      const onSubmit = jest.fn();
      const defaultProps: Omit<FilterEditorProps, 'intl'> = {
        theme: {
          euiTheme: {} as unknown as EuiThemeComputed<{}>,
          colorMode: 'DARK',
          modifications: [],
          highContrastMode: false,
        } as UseEuiTheme<{}>,
        filter: {
          meta: {
            type: 'custom',
          } as any,
          $state: {
            store: FilterStateStore.APP_STATE,
          },
        },
        indexPatterns: [],
        onCancel: jest.fn(),
        onSubmit,
        docLinks: coreMock.createStart().docLinks,
        dataViews: dataMock.dataViews,
      };
      const testBed: TestBed = await registerTestBed(FilterEditor, { defaultProps })();
      const { find } = testBed;

      find('customEditorInput').simulate('change', {
        target: { value: '{ "wildcard": { "kibana.alert.rule.name": "test*" } }' },
      });

      find('saveFilter').simulate('click');
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          wildcard: { 'kibana.alert.rule.name': 'test*' },
          meta: expect.objectContaining({
            type: 'custom',
            disabled: false,
            negate: false,
          }),
        })
      );
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
          highContrastMode: false,
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

    describe('with a nested field', () => {
      const nestedDataView = createNestedDataView(dataViewMockList[0]);
      const filter = {
        meta: {
          type: 'phrase',
          index: nestedDataView.id,
          key: 'user.name',
          params: { query: 'alice' },
          disabled: false,
          negate: false,
          alias: null,
        },
        query: { match_phrase: { 'user.name': 'alice' } },
        $state: { store: FilterStateStore.APP_STATE },
      };
      const nestedQueryDslFilter = {
        queryDsl: JSON.stringify(
          { nested: { path: 'user', query: { match_phrase: { 'user.name': 'alice' } } } },
          null,
          2
        ),
        customLabel: '',
        dataViewId: nestedDataView.id,
      };
      const services = { data: dataMock, uiSettings: coreMock.createStart().uiSettings };
      const FilterEditorWithServices = (props: ComponentProps<typeof FilterEditor>) => (
        <KibanaContextProvider services={services}>
          <FilterEditor {...props} />
        </KibanaContextProvider>
      );
      let onSubmit: jest.Mock;
      let onLocalFilterCreate: jest.Mock;
      let onLocalFilterUpdate: jest.Mock;
      let nestedTestBed: TestBed;

      beforeEach(async () => {
        dataMock.dataViews.get = jest.fn().mockResolvedValue(nestedDataView);
        onSubmit = jest.fn();
        onLocalFilterCreate = jest.fn();
        onLocalFilterUpdate = jest.fn();
        const defaultProps: Omit<FilterEditorProps, 'intl'> = {
          theme: {
            euiTheme: {} as unknown as EuiThemeComputed<{}>,
            colorMode: 'DARK',
            modifications: [],
            highContrastMode: false,
          } as UseEuiTheme<{}>,
          filter,
          indexPatterns: [dataViewMockList[0]],
          onCancel: jest.fn(),
          onSubmit,
          onLocalFilterCreate,
          onLocalFilterUpdate,
          docLinks: coreMock.createStart().docLinks,
          dataViews: dataMock.dataViews,
        };
        nestedTestBed = await registerTestBed(FilterEditorWithServices, { defaultProps })();
        await act(async () => {});
        nestedTestBed.component.update();
      });

      it('shows the loaded filter in the builder and reports it as unchanged', () => {
        const { exists, component } = nestedTestBed;
        expect(exists('filterParams')).toBe(true);
        expect(component.text()).toContain('user.name');
        expect(component.html()).toContain('alice');

        // Baseline and latest update match, so closing the editor doesn't report unsaved changes.
        expect(onLocalFilterCreate).toHaveBeenLastCalledWith(expect.objectContaining({ filter }));
        expect(onLocalFilterUpdate).toHaveBeenLastCalledWith(filter);
      });

      it('generates the Query DSL for the loaded data view and keeps the filter when unchanged', () => {
        const { find } = nestedTestBed;
        expect(onLocalFilterCreate).toHaveBeenLastCalledWith(
          expect.objectContaining({ queryDslFilter: nestedQueryDslFilter })
        );

        find('editQueryDSL').simulate('click');

        // Matches the baseline, so closing the editor doesn't report unsaved changes.
        expect(onLocalFilterUpdate).toHaveBeenLastCalledWith(nestedQueryDslFilter);

        find('saveFilter').simulate('click');

        // Unchanged Query DSL keeps the phrase filter instead of converting it to a custom filter.
        expect(onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({ meta: expect.objectContaining({ type: 'phrase' }) })
        );
      });
    });
  });
  describe('with a filter that cannot be converted to Query DSL', () => {
    const booleanDataView = {
      ...dataViewMockList[0],
      id: 'boolean-data-view-id',
      fields: [
        {
          name: 'flag',
          type: 'boolean',
          esTypes: ['boolean'],
          aggregatable: true,
          filterable: true,
          searchable: true,
        },
      ],
      getName: () => 'boolean',
    } as unknown as DataView;
    // A legacy phrase filter converts its value to the field type, which throws for text on a boolean.
    const filter = {
      meta: {
        type: 'phrase',
        index: booleanDataView.id,
        key: 'flag',
        params: { query: 'not-a-boolean' },
        disabled: false,
        negate: false,
        alias: null,
      },
      query: { match: { flag: { query: 'not-a-boolean', type: 'phrase' } } },
      $state: { store: FilterStateStore.APP_STATE },
    };
    const services = { data: dataMock, uiSettings: coreMock.createStart().uiSettings };
    const renderEditor = async (props: Partial<FilterEditorProps>) => {
      const onLocalFilterCreate = jest.fn();
      const testBed = await registerTestBed(
        (editorProps: ComponentProps<typeof FilterEditor>) => (
          <KibanaContextProvider services={services}>
            <FilterEditor {...editorProps} />
          </KibanaContextProvider>
        ),
        {
          defaultProps: {
            theme: {
              euiTheme: {} as unknown as EuiThemeComputed<{}>,
              colorMode: 'DARK',
              modifications: [],
              highContrastMode: false,
            } as UseEuiTheme<{}>,
            filter,
            indexPatterns: [dataViewMockList[0]],
            onCancel: jest.fn(),
            onSubmit: jest.fn(),
            onLocalFilterCreate,
            docLinks: coreMock.createStart().docLinks,
            ...props,
          } as Omit<FilterEditorProps, 'intl'>,
        }
      )();
      await act(async () => {});
      testBed.component.update();
      return { ...testBed, onLocalFilterCreate };
    };

    it('stops loading when the data view loaded by ID cannot convert the filter', async () => {
      dataMock.dataViews.get = jest.fn().mockResolvedValue(booleanDataView);
      const { exists, onLocalFilterCreate } = await renderEditor({ dataViews: dataMock.dataViews });

      expect(exists('filterIndexPatternsSelect')).toBe(true);
      expect(onLocalFilterCreate).toHaveBeenLastCalledWith(expect.objectContaining({ filter }));
    });

    it('does not select a data view that cannot convert the filter', async () => {
      dataMock.dataViews.get = jest
        .fn()
        .mockRejectedValue(new SavedObjectNotFound({ type: 'index-pattern', id: 'missing' }));
      const { exists, find } = await renderEditor({
        filter: { ...filter, meta: { ...filter.meta, index: 'missing-data-view-id' } },
        indexPatterns: [booleanDataView],
        dataViews: dataMock.dataViews,
      });

      // Shown as Query DSL with the original ID, instead of selecting the incompatible data view.
      expect(exists('customEditorInput')).toBe(true);
      expect(find('filterIndexPatternsSelect').find('input').props().value).toBe('');
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
          highContrastMode: false,
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
  describe('filter whose data view cannot be found and whose fields match no provided data view', () => {
    const filter = {
      meta: {
        type: 'phrase',
        index: 'missing-data-view-id',
        key: 'unknown.field',
        params: { query: 'value' },
        disabled: false,
        negate: false,
        alias: null,
      },
      query: { match_phrase: { 'unknown.field': 'value' } },
      $state: { store: FilterStateStore.APP_STATE },
    };
    let onSubmit: jest.Mock;
    let testBed: TestBed;

    beforeEach(async () => {
      dataMock.dataViews.get = jest
        .fn()
        .mockRejectedValue(
          new SavedObjectNotFound({ type: 'index-pattern', id: 'missing-data-view-id' })
        );
      onSubmit = jest.fn();
      const defaultProps: Omit<FilterEditorProps, 'intl'> = {
        theme: {
          euiTheme: {} as unknown as EuiThemeComputed<{}>,
          colorMode: 'DARK',
          modifications: [],
          highContrastMode: false,
        } as UseEuiTheme<{}>,
        filter,
        indexPatterns: [dataViewMockList[0]],
        onCancel: jest.fn(),
        onSubmit,
        docLinks: coreMock.createStart().docLinks,
        dataViews: dataMock.dataViews,
      };
      testBed = await registerTestBed(FilterEditor, { defaultProps })();
    });

    it('shows the filter as Query DSL instead of an empty filter and submits it unchanged', async () => {
      const { component, exists, find } = testBed;
      await act(async () => {});
      component.update();

      expect(exists('customEditorInput')).toBe(true);
      expect(JSON.parse(find('customEditorInput').props().value)).toEqual(filter.query);

      find('saveFilter').simulate('click');
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          query: filter.query,
          meta: expect.objectContaining({ index: 'missing-data-view-id', key: 'unknown.field' }),
        })
      );
    });
  });
});
