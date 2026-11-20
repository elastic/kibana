/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render, screen, waitFor, within, act } from '@testing-library/react';
import type { Filter } from '@kbn/es-query';
import { FilterStateStore, buildCombinedFilter, BooleanRelation } from '@kbn/es-query';
import type { FilterEditorProps } from './filter_editor';
import { FilterEditor } from './filter_editor';
import { I18nProvider } from '@kbn/i18n-react';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import type { DataView } from '@kbn/data-views-plugin/common';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { SavedObjectNotFound } from '@kbn/kibana-utils-plugin/public';
import type { FilterableSource } from '@kbn/data-source';

const getStorage = (v: string) => {
  const storage = createMockStorage();
  storage.get.mockReturnValue(v);
  return storage;
};
const createMockWebStorage = () => ({
  clear: jest.fn(),
  getItem: jest.fn(),
  key: jest.fn(),
  removeItem: jest.fn(),
  setItem: jest.fn(),
  length: 0,
});

const createMockStorage = () => ({
  storage: createMockWebStorage(),
  get: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
  clear: jest.fn(),
});
const startMock = coreMock.createStart();
const dataMock = dataPluginMock.createStartContract();

const services = {
  data: dataMock,
  storage: getStorage('kuery'),
  uiSettings: startMock.uiSettings,
};

const filterIs = (value: string | undefined = '23', negate = false): Filter => ({
  meta: {
    disabled: false,
    negate,
    alias: null,
    index: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
    key: 'price',
    params: {
      query: value,
    },
    type: 'phrase',
  },
  query: {
    match_phrase: {
      price: value,
    },
  },
  $state: {
    store: FilterStateStore.APP_STATE,
  },
});

const filterIsOneOf = (values: string[] | undefined = undefined, negate = false): Filter => ({
  meta: {
    alias: null,
    disabled: false,
    index: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
    key: 'price',
    negate,
    params: values,
    type: 'phrases',
  },
  query: {
    bool: {
      minimum_should_match: 1,
      should: values
        ? values.map((value) => ({
            match_phrase: {
              price: value,
            },
          }))
        : {
            match_phrase: {
              price: 0,
            },
          },
    },
  },
  $state: {
    store: FilterStateStore.APP_STATE,
  },
});

const filterIsBetween = (
  values: { gte?: string; lt?: string } = { gte: undefined, lt: undefined },
  negate = false
): Filter => ({
  meta: {
    disabled: false,
    negate,
    alias: null,
    index: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
    key: 'price',
    params: values,
    type: 'range',
  },
  query: {
    range: {
      price: values,
    },
  },
  $state: {
    store: FilterStateStore.APP_STATE,
  },
});

const filterLessThan = filterIsBetween({ lt: '30' });
const filterGreaterOrEqual = filterIsBetween({ gte: '20' });

const filterPhrases = (
  field: string,
  values: string[],
  negate = false,
  fieldType = 'string'
): Filter => ({
  meta: {
    alias: null,
    disabled: false,
    index: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
    key: field,
    negate,
    params: values,
    type: 'phrases',
  },
  query: {
    bool: {
      minimum_should_match: 1,
      should: values.map((value) => ({
        match_phrase: {
          [field]: fieldType === 'number' ? Number(value) : value,
        },
      })),
    },
  },
  $state: {
    store: FilterStateStore.APP_STATE,
  },
});

const filterRange = (
  field: string,
  params: { gte?: number; lt?: number },
  negate = false
): Filter => ({
  meta: {
    disabled: false,
    negate,
    alias: null,
    index: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
    key: field,
    params,
    type: 'range',
  },
  query: {
    range: {
      [field]: params,
    },
  },
  $state: {
    store: FilterStateStore.APP_STATE,
  },
});

const filterPhrase = (field: string, value: string, negate = false): Filter => ({
  meta: {
    disabled: false,
    negate,
    alias: null,
    index: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
    key: field,
    params: {
      query: value,
    },
    type: 'phrase',
  },
  query: {
    match_phrase: {
      [field]: value,
    },
  },
  $state: {
    store: FilterStateStore.APP_STATE,
  },
});

const mockedDataView = {
  id: 'ff959d40-b880-11e8-a6d9-e546fe2bba5f',
  title: 'logstash-*',
  fields: [
    {
      name: 'price',
      type: 'number',
      esTypes: ['integer'],
      aggregatable: true,
      filterable: true,
      searchable: true,
    },
    {
      name: 'extension',
      type: 'string',
      esTypes: ['keyword'],
      aggregatable: true,
      filterable: true,
      searchable: true,
    },
    {
      name: 'bytes',
      type: 'number',
      esTypes: ['long'],
      aggregatable: true,
      filterable: true,
      searchable: true,
    },
    {
      name: 'clientip',
      type: 'ip',
      esTypes: ['ip'],
      aggregatable: true,
      filterable: true,
      searchable: true,
    },
  ],
  getName: () => 'logstash-*',
} as DataView;

const defaultProps = {
  filter: filterIs('23'),
  filtersForSuggestions: [],
  indexPatterns: [mockedDataView],
  onCancel: jest.fn(),
  onSubmit: jest.fn(),
  docLinks: startMock.docLinks,
};

const renderFilterEditor = async (propsOverrides?: Partial<FilterEditorProps>) => {
  await act(async () => {
    render(<FilterEditor {...defaultProps} {...propsOverrides} />, {
      wrapper: ({ children }) => (
        <I18nProvider>
          <KibanaContextProvider services={services}>{children}</KibanaContextProvider>
        </I18nProvider>
      ),
    });
  });

  await waitFor(() => {
    expect(screen.getByRole('combobox', { name: /select operator/i })).toBeInTheDocument();
  });
};

const getFilterBadgeTextContent = () => screen.getByTestId('filter-preview').textContent;

const getMultiValuesParamsValue = () => {
  const mainNode = screen.queryByTestId('filterParams');
  if (!mainNode) {
    throw new Error('Node has not been found');
  }

  const filterPills = within(mainNode).queryAllByTestId('euiComboBoxPill');
  if (filterPills.length === 0) {
    return '';
  } else {
    return filterPills.map((pill) => pill.textContent);
  }
};

const getSingleParamValue = () => {
  return (screen.getByRole('spinbutton', { name: /enter a value/i }) as HTMLInputElement).value;
};

const getBetweenParamsValue = () => {
  const mainNode = screen.queryByTestId('filterParams');
  if (!mainNode) {
    throw new Error('Node has not been found');
  }
  return (within(mainNode).getAllByRole('spinbutton') as HTMLInputElement[])
    .map((el) => el.value)
    .join(',');
};

// EuiComboBox renders its dropdown asynchronously. Click the input to open it,
// wait for the option to actually appear in the listbox, then click it and wait
// for the listbox to close so subsequent assertions see fully-reconciled state.
// The previous fully-synchronous implementation raced on slower environments
// (CI under worker contention) and produced timeouts plus cascading "partial
// state" failures in the test that ran next.
const chooseOperator = async (operator: string) => {
  fireEvent.click(screen.getByRole('combobox', { name: /select operator/i }));
  const option = await screen.findByRole('option', { name: operator });
  fireEvent.click(option);
  await waitFor(() => {
    expect(
      screen.queryByRole('listbox', { name: 'Choose from the following options' })
    ).not.toBeInTheDocument();
  });
};

// First render of `<FilterEditor>` in this suite is expensive (~3-4s locally on
// Apple Silicon due to EUI + DnD + Suspense init). The default 5s timeout has
// no headroom on CI under load, so bump it for the whole file.
jest.setTimeout(15000);

describe('Preserving or clearing value on operator change', () => {
  describe('preserves value with no change', () => {
    it('is <-> is not', async () => {
      await renderFilterEditor();
      await chooseOperator('is not');
      expect(getSingleParamValue()).toEqual('23');
      expect(getFilterBadgeTextContent()).toBe('NOT price: 23');
      await chooseOperator('is');
      expect(getSingleParamValue()).toEqual('23');
      expect(getFilterBadgeTextContent()).toBe('price: 23');
    });
    it('is one of <-> is not one of', async () => {
      const filterValues = ['23', '48', '89'];

      await renderFilterEditor({
        filter: filterIsOneOf(filterValues),
      });
      await chooseOperator('is not one of');
      expect(getMultiValuesParamsValue()).toEqual(filterValues);
      expect(getFilterBadgeTextContent()).toBe('NOT price: is one of 23, 48, 89');
      await chooseOperator('is one of');
      expect(getMultiValuesParamsValue()).toEqual(filterValues);
      expect(getFilterBadgeTextContent()).toBe('price: is one of 23, 48, 89');
    });
    it('is between <-> is not between', async () => {
      await renderFilterEditor({
        filter: filterIsBetween({ gte: '20', lt: '30' }),
      });
      await chooseOperator('is not between');
      expect(getBetweenParamsValue()).toEqual('20,30');
      expect(getFilterBadgeTextContent()).toBe('NOT price: 20 to 30');
      await chooseOperator('is between');
      expect(getBetweenParamsValue()).toEqual('20,30');
      expect(getFilterBadgeTextContent()).toBe('price: 20 to 30');
    });

    it('less than -> between', async () => {
      await renderFilterEditor({
        filter: filterLessThan,
      });
      await chooseOperator('is between');
      expect(getBetweenParamsValue()).toEqual(',30');
      expect(getFilterBadgeTextContent()).toBe('price: < 30');
    });
    it('greater than ->  is between', async () => {
      await renderFilterEditor({
        filter: filterGreaterOrEqual,
      });
      await chooseOperator('is between');
      expect(getBetweenParamsValue()).toEqual('20,');
      expect(getFilterBadgeTextContent()).toBe('price: ≥ 20');
    });
  });

  describe('clears value', () => {
    it('is <-> exists', async () => {
      await renderFilterEditor();
      await chooseOperator('exists');
      expect(getFilterBadgeTextContent()).toBe('price: exists');
      await chooseOperator('is');
      expect(getSingleParamValue()).toEqual('');
      expect(getFilterBadgeTextContent()).toBe('price: 0');
    });
    it('is one of -> is between', async () => {
      await renderFilterEditor({
        filter: filterIsBetween({ gte: '20', lt: '30' }),
      });
      await chooseOperator('is one of');
      expect(getMultiValuesParamsValue()).toEqual('');
      expect(screen.queryByTestId('filter-preview')).not.toBeInTheDocument();
    });
    it('is between -> is', async () => {
      await renderFilterEditor({
        filter: filterIsBetween({ gte: '20', lt: '30' }),
      });
      await chooseOperator('is');
      expect(getSingleParamValue()).toEqual('');
      expect(getFilterBadgeTextContent()).toBe('price: 0');
    });
    it('is -> is between', async () => {
      await renderFilterEditor();
      await chooseOperator('is between');
      expect(getBetweenParamsValue()).toEqual(',');
      expect(getFilterBadgeTextContent()).toBe('price: -');
    });
    it('is between -> is one of', async () => {
      await renderFilterEditor({
        filter: filterIsBetween({ gte: '20', lt: '30' }),
      });
      await chooseOperator('is one of');
      expect(getMultiValuesParamsValue()).toEqual('');
      expect(screen.queryByTestId('filter-preview')).not.toBeInTheDocument();
    });
  });

  describe('converts and partially preserves value', () => {
    it('is -> is one of', async () => {
      await renderFilterEditor();
      await chooseOperator('is one of');
      expect(getMultiValuesParamsValue()).toEqual(['23']);
      expect(getFilterBadgeTextContent()).toBe('price: is one of 23');
    });
    it('is -> is not one of', async () => {
      await renderFilterEditor();
      await chooseOperator('is not one of');
      expect(getMultiValuesParamsValue()).toEqual(['23']);
      expect(getFilterBadgeTextContent()).toBe('NOT price: is one of 23');
    });
    it('is one of -> is', async () => {
      await renderFilterEditor({
        filter: filterIsOneOf(['23', '48', '89']),
      });
      await chooseOperator('is');
      expect(getSingleParamValue()).toEqual('23');
      expect(getFilterBadgeTextContent()).toBe('price: 23');
    });
    it('is one of -> is not', async () => {
      await renderFilterEditor({
        filter: filterIsOneOf(['23', '48', '89']),
      });
      await chooseOperator('is not');
      expect(getSingleParamValue()).toEqual('23');
      expect(getFilterBadgeTextContent()).toBe('NOT price: 23');
    });
    it('is between -> less than', async () => {
      await renderFilterEditor({
        filter: filterIsBetween({ gte: '20', lt: '30' }),
      });
      await chooseOperator('less than');
      expect(getSingleParamValue()).toEqual('30');
      expect(getFilterBadgeTextContent()).toBe('price: < 30');
    });
    it('is between -> greater than', async () => {
      await renderFilterEditor({
        filter: filterIsBetween({ gte: '20', lt: '30' }),
      });
      await chooseOperator('greater or equal');
      expect(getSingleParamValue()).toEqual('20');
      expect(getFilterBadgeTextContent()).toBe('price: ≥ 20');
    });
  });
});

describe('Combined filter preview text', () => {
  const renderCombinedFilterEditor = async (filter: Filter) => {
    await act(async () => {
      render(<FilterEditor {...defaultProps} filter={filter} />, {
        wrapper: ({ children }) => (
          <I18nProvider>
            <KibanaContextProvider services={services}>{children}</KibanaContextProvider>
          </I18nProvider>
        ),
      });
    });

    // For combined filters, wait for the preview badge instead of operator combobox
    await waitFor(() => {
      expect(screen.getByTestId('filter-preview')).toBeInTheDocument();
    });
  };

  it('should display OR compound filter preview', async () => {
    const orFilter = buildCombinedFilter(
      BooleanRelation.OR,
      [filterPhrase('extension', 'png'), filterRange('bytes', { gte: 1000, lt: 2000 })],
      mockedDataView
    );

    await renderCombinedFilterEditor(orFilter);

    expect(getFilterBadgeTextContent()).toBe('extension: png OR bytes: 1000 to 2000');
  });

  it('should display AND compound filter preview', async () => {
    const andFilter = buildCombinedFilter(
      BooleanRelation.AND,
      [filterPhrases('extension', ['png', 'jpeg']), filterRange('bytes', { gte: 1000, lt: 2000 })],
      mockedDataView
    );

    await renderCombinedFilterEditor(andFilter);

    expect(getFilterBadgeTextContent()).toBe(
      'extension: is one of png, jpeg AND bytes: 1000 to 2000'
    );
  });

  it('should display nested filters with brackets', async () => {
    const nestedOrFilter = buildCombinedFilter(
      BooleanRelation.OR,
      [filterPhrase('clientip', '127.0.0.1', true), filterPhrases('extension', ['png', 'jpeg'])],
      mockedDataView
    );

    const nestedAndFilter = buildCombinedFilter(
      BooleanRelation.AND,
      [nestedOrFilter, filterRange('bytes', { gte: 1000, lt: 2000 })],
      mockedDataView
    );

    await renderCombinedFilterEditor(nestedAndFilter);

    expect(getFilterBadgeTextContent()).toBe(
      '(NOT clientip: 127.0.0.1 OR extension: is one of png, jpeg) AND bytes: 1000 to 2000'
    );
  });
});

describe('Filter whose data view cannot be found', () => {
  const missingDataViewId = 'missing-data-view-id';
  const withMissingDataView = (filter: Filter): Filter => ({
    ...filter,
    meta: { ...filter.meta, index: missingDataViewId },
  });

  const onLocalFilterCreate = jest.fn();
  const notFoundError = new SavedObjectNotFound({ type: 'index-pattern', id: missingDataViewId });
  const renderWithMissingDataView = async (
    filter: Filter,
    {
      indexPatterns = [mockedDataView],
      loadDataView = () => Promise.reject(notFoundError),
      withDataViewsService = true,
    }: {
      indexPatterns?: FilterableSource[];
      loadDataView?: () => Promise<DataView>;
      withDataViewsService?: boolean;
    } = {}
  ) => {
    const onSubmit = jest.fn();
    const onLocalFilterUpdate = jest.fn();
    const dataViews = withDataViewsService
      ? { ...dataMock.dataViews, get: jest.fn(loadDataView) }
      : undefined;
    let unmount = () => {};

    await act(async () => {
      ({ unmount } = render(
        <FilterEditor
          {...defaultProps}
          filter={filter}
          indexPatterns={indexPatterns}
          onSubmit={onSubmit}
          onLocalFilterCreate={onLocalFilterCreate}
          onLocalFilterUpdate={onLocalFilterUpdate}
          dataViews={dataViews}
        />,
        {
          wrapper: ({ children }) => (
            <I18nProvider>
              <KibanaContextProvider services={services}>{children}</KibanaContextProvider>
            </I18nProvider>
          ),
        }
      ));
    });

    return { onSubmit, onLocalFilterUpdate, unmount };
  };

  it('selects a provided data view with the filter field, keeps the value and saves its ID', async () => {
    const { onSubmit } = await renderWithMissingDataView(
      withMissingDataView(filterPhrase('bytes', '1024'))
    );

    await waitFor(() => {
      expect(getSingleParamValue()).toBe('1024');
    });

    fireEvent.click(screen.getByTestId('saveFilter'));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        meta: expect.objectContaining({ index: mockedDataView.id, key: 'bytes' }),
      })
    );
  });

  it('notifies that another data view was selected until the user picks one', async () => {
    const otherDataView = { ...mockedDataView, id: 'other-id', getName: () => 'other' } as DataView;
    await renderWithMissingDataView(withMissingDataView(filterPhrase('bytes', '1024')), {
      indexPatterns: [mockedDataView, otherDataView],
    });

    expect(await screen.findByTestId('filterEditorRecoveredDataViewNotice')).toHaveTextContent(
      'logstash-*'
    );

    const pickDataView = async (name: string) => {
      fireEvent.click(
        within(screen.getByTestId('filterIndexPatternsSelect')).getByRole('combobox')
      );
      fireEvent.click(await screen.findByRole('option', { name }));
      await waitFor(() => {
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    };
    await pickDataView('other');
    expect(screen.queryByTestId('filterEditorRecoveredDataViewNotice')).not.toBeInTheDocument();

    // Picking the automatically selected data view again is the user's own choice.
    await pickDataView('logstash-*');
    expect(screen.queryByTestId('filterEditorRecoveredDataViewNotice')).not.toBeInTheDocument();
  });

  it('selects a data view by its fields for a filter without a data view ID', async () => {
    const filter = filterPhrase('bytes', '1024');
    const { onSubmit } = await renderWithMissingDataView({
      ...filter,
      meta: { ...filter.meta, index: undefined },
    });

    expect(await screen.findByTestId('filterEditorRecoveredDataViewNotice')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('saveFilter'));

    expect(onSubmit.mock.calls[0][0].meta.index).toBe(mockedDataView.id);
  });

  it('keeps the data view ID and shows Query DSL without the data views service', async () => {
    const { onSubmit } = await renderWithMissingDataView(
      withMissingDataView(filterPhrase('bytes', '1024')),
      { withDataViewsService: false }
    );
    await waitFor(() => {
      expect(screen.getByTestId('filterIndexPatternsSelect')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('filterEditorRecoveredDataViewNotice')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('saveFilter'));

    expect(onSubmit.mock.calls[0][0].meta.index).toBe(missingDataViewId);
  });

  it('ignores a data view that fails to load after the editor was closed', async () => {
    let rejectLoad: (error: Error) => void = () => {};
    const { onLocalFilterUpdate, unmount } = await renderWithMissingDataView(
      withMissingDataView(filterPhrase('bytes', '1024')),
      { loadDataView: () => new Promise((_, reject) => (rejectLoad = reject)) }
    );
    onLocalFilterUpdate.mockClear();

    unmount();
    await act(async () => rejectLoad(notFoundError));

    expect(onLocalFilterUpdate).not.toHaveBeenCalled();
  });

  it('keeps the data view ID and shows Query DSL when loading fails for another reason', async () => {
    const { onSubmit } = await renderWithMissingDataView(
      withMissingDataView(filterPhrase('bytes', '1024')),
      { loadDataView: () => Promise.reject(new Error('Network error')) }
    );
    await waitFor(() => {
      expect(screen.getByTestId('filterIndexPatternsSelect')).toBeInTheDocument();
    });

    expect(screen.queryByTestId('filterEditorRecoveredDataViewNotice')).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('saveFilter'));

    expect(onSubmit.mock.calls[0][0].meta.index).toBe(missingDataViewId);
  });

  it('does not select an ES|QL source', async () => {
    const { fields } = mockedDataView;
    const esqlSource: FilterableSource = {
      kind: 'esql',
      id: 'esql-dataset-id',
      title: 'esql',
      fields,
      isTimeBased: () => false,
      getFieldByName: (name) => fields.find((field) => field.name === name),
    };
    const { onSubmit } = await renderWithMissingDataView(
      withMissingDataView(filterPhrase('bytes', '1024')),
      { indexPatterns: [esqlSource] }
    );
    await waitFor(() => {
      expect(screen.getByTestId('filterIndexPatternsSelect')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('saveFilter'));

    expect(onSubmit.mock.calls[0][0].meta.index).toBe(missingDataViewId);
  });

  it('skips data views where the filter field is not filterable', async () => {
    const nonSearchableDataView = {
      ...mockedDataView,
      id: 'non-searchable-data-view-id',
      fields: mockedDataView.fields.map((field) => ({ ...field, searchable: false })),
      getName: () => 'non-searchable',
    } as DataView;
    const { onSubmit } = await renderWithMissingDataView(
      withMissingDataView(filterPhrase('bytes', '1024')),
      { indexPatterns: [nonSearchableDataView, mockedDataView] }
    );

    await waitFor(() => {
      expect(getSingleParamValue()).toBe('1024');
    });

    fireEvent.click(screen.getByTestId('saveFilter'));

    expect(onSubmit.mock.calls[0][0].meta.index).toBe(mockedDataView.id);
  });

  it('saves the data view picked in Query DSL mode when no data view has the filter fields', async () => {
    const { onSubmit, onLocalFilterUpdate } = await renderWithMissingDataView(
      withMissingDataView(filterPhrase('unknown.field', 'value'))
    );
    await waitFor(() => {
      expect(screen.getByTestId('filterIndexPatternsSelect')).toBeInTheDocument();
    });

    const dataViewPicker = within(screen.getByTestId('filterIndexPatternsSelect'));
    fireEvent.change(dataViewPicker.getByRole('combobox'), { target: { value: 'logstash' } });
    fireEvent.click(await screen.findByRole('option', { name: 'logstash-*' }));

    // Reported as a change, so closing the editor asks before discarding the selection.
    expect(onLocalFilterUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({ dataViewId: mockedDataView.id })
    );

    fireEvent.click(screen.getByTestId('saveFilter'));

    expect(onSubmit.mock.calls[0][0].meta.index).toBe(mockedDataView.id);
  });

  it('keeps the missing data view ID in Query DSL mode when no data view is picked', async () => {
    const { onSubmit, onLocalFilterUpdate } = await renderWithMissingDataView(
      withMissingDataView(filterPhrase('unknown.field', 'value'))
    );
    await waitFor(() => {
      expect(screen.getByTestId('filterIndexPatternsSelect')).toBeInTheDocument();
    });

    expect(onLocalFilterCreate).toHaveBeenLastCalledWith(
      expect.objectContaining({
        queryDslFilter: expect.objectContaining({ dataViewId: missingDataViewId }),
      })
    );
    expect(onLocalFilterUpdate).toHaveBeenLastCalledWith(
      expect.objectContaining({ dataViewId: missingDataViewId })
    );

    fireEvent.click(screen.getByTestId('saveFilter'));

    expect(onSubmit.mock.calls[0][0].meta.index).toBe(missingDataViewId);
  });

  it('reports no change when a recovered filter is switched to Query DSL', async () => {
    const { onLocalFilterUpdate } = await renderWithMissingDataView(
      withMissingDataView(filterPhrase('bytes', '1024'))
    );
    await waitFor(() => {
      expect(getSingleParamValue()).toBe('1024');
    });

    fireEvent.click(screen.getByTestId('editQueryDSL'));

    const [[{ queryDslFilter }]] = onLocalFilterCreate.mock.calls.slice(-1);
    expect(queryDslFilter.dataViewId).toBe(mockedDataView.id);
    expect(onLocalFilterUpdate).toHaveBeenLastCalledWith(queryDslFilter);
  });

  it('points the nested filters of a combined filter to the selected data view', async () => {
    const combinedFilter = buildCombinedFilter(
      BooleanRelation.AND,
      [
        withMissingDataView(filterPhrase('extension', 'png')),
        withMissingDataView(filterRange('bytes', { gte: 1000, lt: 2000 })),
      ],
      { ...mockedDataView, id: missingDataViewId } as DataView
    );
    const { onSubmit } = await renderWithMissingDataView(combinedFilter);

    await waitFor(() => {
      expect(getFilterBadgeTextContent()).toBe('extension: png AND bytes: 1000 to 2000');
    });

    fireEvent.click(screen.getByTestId('saveFilter'));

    const [[submittedFilter]] = onSubmit.mock.calls;
    expect(submittedFilter.meta.index).toBe(mockedDataView.id);
    expect(submittedFilter.meta.params.map(({ meta }: Filter) => meta.index)).toEqual([
      mockedDataView.id,
      mockedDataView.id,
    ]);
  });

  it('saves the selected data view ID when submitted in Query DSL mode', async () => {
    const { onSubmit } = await renderWithMissingDataView(
      withMissingDataView(filterPhrase('bytes', '1024'))
    );
    await waitFor(() => {
      expect(getSingleParamValue()).toBe('1024');
    });

    fireEvent.click(screen.getByTestId('editQueryDSL'));
    fireEvent.click(screen.getByTestId('saveFilter'));

    expect(onSubmit.mock.calls[0][0].meta.index).toBe(mockedDataView.id);
  });

  it('registers the recovered filter as the unchanged baseline', async () => {
    await renderWithMissingDataView(withMissingDataView(filterPhrase('bytes', '1024')));

    await waitFor(() => {
      expect(onLocalFilterCreate).toHaveBeenLastCalledWith(
        expect.objectContaining({
          filter: expect.objectContaining({
            meta: expect.objectContaining({ index: mockedDataView.id, key: 'bytes' }),
          }),
        })
      );
    });
  });
});
