/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { Filter, FilterStateStore } from '@kbn/es-query';
import { FilterEditor, FilterEditorProps } from './filter_editor';
import { I18nProvider } from '@kbn/i18n-react';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import type { DataView } from '@kbn/data-views-plugin/common';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';

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
  render(<FilterEditor {...defaultProps} {...propsOverrides} />, {
    wrapper: ({ children }) => (
      <I18nProvider>
        <KibanaContextProvider services={services}>{children}</KibanaContextProvider>
      </I18nProvider>
    ),
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

const chooseOperator = (operator: string) => {
  fireEvent.click(screen.getByRole('combobox', { name: /select operator/i }));
  fireEvent.click(screen.getByRole('option', { name: operator }));
};

const waitForComboboxToBeClosed = () => {
  waitFor(() => {
    expect(
      screen.queryByRole('listbox', { name: 'Choose from the following options' })
    ).not.toBeInTheDocument();
  });
};

describe('Preserving or clearing value on operator change', () => {
  describe('preserves value with no change', () => {
    afterEach(() => {
      // close combobox to prevent "memory leak" warning
      waitForComboboxToBeClosed();
    });
    it('is <-> is not', async () => {
      await renderFilterEditor();
      chooseOperator('is not');
      expect(getSingleParamValue()).toEqual('23');
      expect(getFilterBadgeTextContent()).toBe('NOT price: 23');
      chooseOperator('is');
      expect(getSingleParamValue()).toEqual('23');
      expect(getFilterBadgeTextContent()).toBe('price: 23');
    });
    it('is one of <-> is not one of', async () => {
      const filterValues = ['23', '48', '89'];

      await renderFilterEditor({
        filter: filterIsOneOf(filterValues),
      });
      chooseOperator('is not one of');
      expect(getMultiValuesParamsValue()).toEqual(filterValues);
      expect(getFilterBadgeTextContent()).toBe('NOT price: is one of 23, 48, 89');
      chooseOperator('is one of');
      expect(getMultiValuesParamsValue()).toEqual(filterValues);
      expect(getFilterBadgeTextContent()).toBe('price: is one of 23, 48, 89');
    });
    it('is between <-> is not between', async () => {
      await renderFilterEditor({
        filter: filterIsBetween({ gte: '20', lt: '30' }),
      });
      chooseOperator('is not between');
      expect(getBetweenParamsValue()).toEqual('20,30');
      expect(getFilterBadgeTextContent()).toBe('NOT price: 20 to 30');
      chooseOperator('is between');
      expect(getBetweenParamsValue()).toEqual('20,30');
      expect(getFilterBadgeTextContent()).toBe('price: 20 to 30');
    });

    it('less than -> between', async () => {
      await renderFilterEditor({
        filter: filterLessThan,
      });
      chooseOperator('is between');
      expect(getBetweenParamsValue()).toEqual(',30');
      expect(getFilterBadgeTextContent()).toBe('price: < 30');
    });
    it('greater than ->  is between', async () => {
      await renderFilterEditor({
        filter: filterGreaterOrEqual,
      });
      chooseOperator('is between');
      expect(getBetweenParamsValue()).toEqual('20,');
      expect(getFilterBadgeTextContent()).toBe('price: ≥ 20');
    });
  });

  describe('clears value', () => {
    it('is <-> exists', async () => {
      await renderFilterEditor();
      chooseOperator('exists');
      expect(getFilterBadgeTextContent()).toBe('price: exists');
      chooseOperator('is');
      expect(getSingleParamValue()).toEqual('');
      expect(getFilterBadgeTextContent()).toBe('price: 0');
    });
    it('is one of -> is between', async () => {
      await renderFilterEditor({
        filter: filterIsBetween({ gte: '20', lt: '30' }),
      });
      chooseOperator('is one of');
      expect(getMultiValuesParamsValue()).toEqual('');
      expect(screen.queryByTestId('filter-preview')).not.toBeInTheDocument();
    });
    it('is between -> is', async () => {
      await renderFilterEditor({
        filter: filterIsBetween({ gte: '20', lt: '30' }),
      });
      chooseOperator('is');
      expect(getSingleParamValue()).toEqual('');
      expect(getFilterBadgeTextContent()).toBe('price: 0');
    });
    it('is -> is between', async () => {
      await renderFilterEditor();
      chooseOperator('is between');
      expect(getBetweenParamsValue()).toEqual(',');
      expect(getFilterBadgeTextContent()).toBe('price: -');
    });
    it('is between -> is one of', async () => {
      await renderFilterEditor({
        filter: filterIsBetween({ gte: '20', lt: '30' }),
      });
      chooseOperator('is one of');
      expect(getMultiValuesParamsValue()).toEqual('');
      expect(screen.queryByTestId('filter-preview')).not.toBeInTheDocument();
    });
  });

  describe('converts and partially preserves value', () => {
    it('is -> is one of', async () => {
      await renderFilterEditor();
      chooseOperator('is one of');
      expect(getMultiValuesParamsValue()).toEqual(['23']);
      expect(getFilterBadgeTextContent()).toBe('price: is one of 23');
    });
    it('is -> is not one of', async () => {
      await renderFilterEditor();
      chooseOperator('is not one of');
      expect(getMultiValuesParamsValue()).toEqual(['23']);
      expect(getFilterBadgeTextContent()).toBe('NOT price: is one of 23');
    });
    it('is one of -> is', async () => {
      await renderFilterEditor({
        filter: filterIsOneOf(['23', '48', '89']),
      });
      chooseOperator('is');
      expect(getSingleParamValue()).toEqual('23');
      expect(getFilterBadgeTextContent()).toBe('price: 23');
    });
    it('is one of -> is not', async () => {
      await renderFilterEditor({
        filter: filterIsOneOf(['23', '48', '89']),
      });
      chooseOperator('is not');
      expect(getSingleParamValue()).toEqual('23');
      expect(getFilterBadgeTextContent()).toBe('NOT price: 23');
    });
    it('is between -> less than', async () => {
      await renderFilterEditor({
        filter: filterIsBetween({ gte: '20', lt: '30' }),
      });
      chooseOperator('less than');
      expect(getSingleParamValue()).toEqual('30');
      expect(getFilterBadgeTextContent()).toBe('price: < 30');
    });
    it('is between -> greater than', async () => {
      await renderFilterEditor({
        filter: filterIsBetween({ gte: '20', lt: '30' }),
      });
      chooseOperator('greater or equal');
      expect(getSingleParamValue()).toEqual('20');
      expect(getFilterBadgeTextContent()).toBe('price: ≥ 20');
    });
  });
});
