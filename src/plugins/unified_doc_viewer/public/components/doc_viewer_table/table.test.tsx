/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { generateEsHits } from '@kbn/discover-utils/src/__mocks__';
import { DocViewerTable, SHOW_ONLY_SELECTED_FIELDS } from './table';
import { mockUnifiedDocViewerServices } from '../../__mocks__';
import { setUnifiedDocViewerServices } from '../../plugin';

const storage = new Storage(window.localStorage);

setUnifiedDocViewerServices(mockUnifiedDocViewerServices);

const dataView = createStubDataView({
  spec: {
    id: 'test',
    title: 'test',
    timeFieldName: '@timestamp',
    fields: {
      '@timestamp': {
        name: '@timestamp',
        type: 'date',
        esTypes: ['date'],
        aggregatable: true,
        searchable: true,
        count: 30,
        readFromDocValues: true,
        scripted: false,
        isMapped: true,
      },
      bytes: {
        name: 'bytes',
        type: 'number',
        esTypes: ['long'],
        aggregatable: true,
        searchable: true,
        count: 10,
        readFromDocValues: true,
        scripted: false,
        isMapped: true,
      },
      'extension.keyword': {
        name: 'extension.keyword',
        type: 'string',
        esTypes: ['keyword'],
        aggregatable: true,
        searchable: true,
        count: 0,
        readFromDocValues: true,
        scripted: false,
        subType: {
          multi: {
            parent: 'extension',
          },
        },
        isMapped: true,
      },
      _id: {
        name: '_id',
        type: 'string',
        esTypes: ['_id'],
        aggregatable: false,
        searchable: true,
        readFromDocValues: true,
        isMapped: true,
      },
    },
  },
});
const hit = buildDataTableRecord(generateEsHits(dataView, 1)[0], dataView);

describe('DocViewerTable', () => {
  afterEach(() => {
    storage.clear();
  });

  describe('table cells', () => {
    it('should render cells', async () => {
      render(
        <IntlProvider locale="en">
          <DocViewerTable dataView={dataView} hit={hit} columns={[]} />
        </IntlProvider>
      );

      expect(screen.getByText('@timestamp')).toBeInTheDocument();
      expect(screen.getByText('2023-12-31T23:00:00.000Z')).toBeInTheDocument();
      expect(screen.getByText('bytes')).toBeInTheDocument();
      expect(screen.getByText('551')).toBeInTheDocument();
      expect(screen.getByText('extension.keyword')).toBeInTheDocument();
      expect(screen.getByText('extension.keyword_0')).toBeInTheDocument();
    });
  });

  describe('search', () => {
    afterEach(() => {
      storage.clear();
    });

    it('should find by field name', async () => {
      render(
        <IntlProvider locale="en">
          <DocViewerTable dataView={dataView} hit={hit} columns={[]} />
        </IntlProvider>
      );

      expect(screen.getByText('@timestamp')).toBeInTheDocument();
      expect(screen.getByText('bytes')).toBeInTheDocument();
      expect(screen.getByText('extension.keyword')).toBeInTheDocument();

      act(() => {
        fireEvent.change(screen.getByTestId('unifiedDocViewerFieldsSearchInput'), {
          target: { value: 'bytes' },
        });
      });

      expect(screen.queryByText('@timestamp')).toBeNull();
      expect(screen.queryByText('bytes')).toBeInTheDocument();
      expect(screen.queryByText('extension.keyword')).toBeNull();
    });

    it('should find by field value', async () => {
      render(
        <IntlProvider locale="en">
          <DocViewerTable dataView={dataView} hit={hit} columns={[]} />
        </IntlProvider>
      );

      expect(screen.getByText('@timestamp')).toBeInTheDocument();
      expect(screen.getByText('bytes')).toBeInTheDocument();
      expect(screen.getByText('extension.keyword')).toBeInTheDocument();

      act(() => {
        fireEvent.change(screen.getByTestId('unifiedDocViewerFieldsSearchInput'), {
          target: { value: '2023' },
        });
      });

      expect(screen.queryByText('@timestamp')).toBeInTheDocument();
      expect(screen.queryByText('bytes')).toBeNull();
      expect(screen.queryByText('extension.keyword')).toBeNull();
    });
  });

  describe('switch - show only selected fields', () => {
    it('should disable the switch if columns is empty', async () => {
      render(
        <IntlProvider locale="en">
          <DocViewerTable dataView={dataView} hit={hit} columns={[]} />
        </IntlProvider>
      );

      expect(screen.getByTestId('unifiedDocViewerShowOnlySelectedFieldsSwitch')).toBeDisabled();
      expect(screen.getByText('@timestamp')).toBeInTheDocument();
      expect(screen.getByText('bytes')).toBeInTheDocument();
      expect(screen.getByText('extension.keyword')).toBeInTheDocument();
    });

    it('should disable the switch even if it was previously switched on', async () => {
      storage.set(SHOW_ONLY_SELECTED_FIELDS, true);

      render(
        <IntlProvider locale="en">
          <DocViewerTable dataView={dataView} hit={hit} columns={[]} />
        </IntlProvider>
      );

      expect(screen.getByTestId('unifiedDocViewerShowOnlySelectedFieldsSwitch')).toBeDisabled();
      expect(screen.getByText('@timestamp')).toBeInTheDocument();
      expect(screen.getByText('bytes')).toBeInTheDocument();
      expect(screen.getByText('extension.keyword')).toBeInTheDocument();
    });

    it('should show only selected fields if it was previously switched on', async () => {
      storage.set(SHOW_ONLY_SELECTED_FIELDS, true);

      render(
        <IntlProvider locale="en">
          <DocViewerTable dataView={dataView} hit={hit} columns={['extension.keyword']} />
        </IntlProvider>
      );

      expect(screen.getByTestId('unifiedDocViewerShowOnlySelectedFieldsSwitch')).toBeEnabled();
      expect(screen.getByText('@timestamp')).toBeInTheDocument();
      expect(screen.queryByText('bytes')).toBeNull();
      expect(screen.getByText('extension.keyword')).toBeInTheDocument();
    });

    it('should allow toggling the switch', async () => {
      render(
        <IntlProvider locale="en">
          <DocViewerTable dataView={dataView} hit={hit} columns={['bytes']} />
        </IntlProvider>
      );

      const showOnlySelectedFieldsSwitch = screen.getByTestId(
        'unifiedDocViewerShowOnlySelectedFieldsSwitch'
      );

      expect(showOnlySelectedFieldsSwitch).toBeEnabled();
      expect(showOnlySelectedFieldsSwitch).toHaveValue('');
      expect(screen.getByText('@timestamp')).toBeInTheDocument();
      expect(screen.getByText('bytes')).toBeInTheDocument();
      expect(screen.getByText('extension.keyword')).toBeInTheDocument();

      act(() => {
        showOnlySelectedFieldsSwitch.click();
      });

      expect(screen.getByText('@timestamp')).toBeInTheDocument();
      expect(screen.getByText('bytes')).toBeInTheDocument();
      expect(screen.queryByText('extension.keyword')).toBeNull();
      expect(storage.get(SHOW_ONLY_SELECTED_FIELDS)).toBe(true);

      act(() => {
        showOnlySelectedFieldsSwitch.click();
      });

      expect(screen.getByText('@timestamp')).toBeInTheDocument();
      expect(screen.getByText('bytes')).toBeInTheDocument();
      expect(screen.getByText('extension.keyword')).toBeInTheDocument();
      expect(storage.get(SHOW_ONLY_SELECTED_FIELDS)).toBe(false);
    });
  });
});
