/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { render } from '@elastic/eui/lib/test/rtl';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { buildDataTableRecord } from '@kbn/discover-utils';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_view.stub';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { generateEsHits } from '@kbn/discover-utils/src/__mocks__';
import { DocViewerTable, SHOW_ONLY_SELECTED_FIELDS, HIDE_NULL_VALUES } from './table';
import { LOCAL_STORAGE_KEY_SELECTED_FIELD_TYPES } from './table_filters';
import { mockUnifiedDocViewerServices } from '../../__mocks__';
import { setUnifiedDocViewerServices } from '../../plugin';
import { userEvent } from '@testing-library/user-event';

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

const setupComponent = (props: Partial<React.ComponentProps<typeof DocViewerTable>> = {}) => {
  const user = userEvent.setup();

  render(
    <IntlProvider locale="en">
      <DocViewerTable dataView={dataView} hit={hit} columns={[]} {...props} />
    </IntlProvider>
  );

  return { user };
};

describe('DocViewerTable', () => {
  afterEach(() => {
    storage.clear();
  });

  describe('table cells', () => {
    it('should render cells', async () => {
      setupComponent();

      expect(screen.getByText('@timestamp')).toBeInTheDocument();
      expect(screen.getByText(hit.flattened['@timestamp'] as string)).toBeInTheDocument();
      expect(screen.getByText('bytes')).toBeInTheDocument();
      expect(screen.getByText(hit.flattened.bytes as string)).toBeInTheDocument();
      expect(screen.getByText('extension.keyword')).toBeInTheDocument();
      expect(screen.getByText(hit.flattened['extension.keyword'] as string)).toBeInTheDocument();
    });
  });

  describe('search', () => {
    beforeEach(() => {
      storage.clear();
    });

    it('should find by field name', async () => {
      const { user } = setupComponent();

      expect(screen.getByText('@timestamp')).toBeInTheDocument();
      expect(screen.getByText('bytes')).toBeInTheDocument();
      expect(screen.getByText('extension.keyword')).toBeInTheDocument();

      await user.click(screen.getByTestId('unifiedDocViewerFieldsSearchInput'));
      await user.paste('bytes');

      expect(screen.queryByText('@timestamp')).toBeNull();
      expect(screen.queryByText('bytes')).toBeInTheDocument();
      expect(screen.queryByText('extension.keyword')).toBeNull();
    });

    it('should find by field value', async () => {
      const { user } = setupComponent();

      expect(screen.getByText('@timestamp')).toBeInTheDocument();
      expect(screen.getByText('bytes')).toBeInTheDocument();
      expect(screen.getByText('extension.keyword')).toBeInTheDocument();

      await user.click(screen.getByTestId('unifiedDocViewerFieldsSearchInput'));
      await user.paste(String(hit.flattened['extension.keyword']));

      expect(screen.queryByText('@timestamp')).toBeNull();
      expect(screen.queryByText('bytes')).toBeNull();
      expect(screen.queryByText('extension.keyword')).toBeInTheDocument();
    });
  });

  describe('switch - show only selected fields', () => {
    describe('when there is a filter function', () => {
      it('should disable the switch if columns is empty', async () => {
        setupComponent({ filter: jest.fn() });

        expect(screen.getByTestId('unifiedDocViewerShowOnlySelectedFieldsSwitch')).toBeDisabled();
        expect(screen.getByText('@timestamp')).toBeInTheDocument();
        expect(screen.getByText('bytes')).toBeInTheDocument();
        expect(screen.getByText('extension.keyword')).toBeInTheDocument();
      });

      it('should disable the switch even if it was previously switched on', async () => {
        storage.set(SHOW_ONLY_SELECTED_FIELDS, true);

        setupComponent({ filter: jest.fn() });

        expect(screen.getByTestId('unifiedDocViewerShowOnlySelectedFieldsSwitch')).toBeDisabled();
        expect(screen.getByText('@timestamp')).toBeInTheDocument();
        expect(screen.getByText('bytes')).toBeInTheDocument();
        expect(screen.getByText('extension.keyword')).toBeInTheDocument();
      });

      it('should show only selected fields if it was previously switched on', async () => {
        storage.set(SHOW_ONLY_SELECTED_FIELDS, true);

        setupComponent({ columns: ['extension.keyword'], filter: jest.fn() });

        expect(screen.getByTestId('unifiedDocViewerShowOnlySelectedFieldsSwitch')).toBeEnabled();
        expect(screen.getByText('@timestamp')).toBeInTheDocument();
        expect(screen.queryByText('bytes')).toBeNull();
        expect(screen.getByText('extension.keyword')).toBeInTheDocument();
      });

      it('should allow toggling the switch', async () => {
        const { user } = setupComponent({ columns: ['bytes'], filter: jest.fn() });

        const showOnlySelectedFieldsSwitch = screen.getByTestId(
          'unifiedDocViewerShowOnlySelectedFieldsSwitch'
        );

        expect(showOnlySelectedFieldsSwitch).toBeEnabled();
        expect(showOnlySelectedFieldsSwitch).toHaveValue('');
        expect(screen.getByText('@timestamp')).toBeInTheDocument();
        expect(screen.getByText('bytes')).toBeInTheDocument();
        expect(screen.getByText('extension.keyword')).toBeInTheDocument();

        await user.click(showOnlySelectedFieldsSwitch);

        expect(screen.getByText('@timestamp')).toBeInTheDocument();
        expect(screen.getByText('bytes')).toBeInTheDocument();
        expect(screen.queryByText('extension.keyword')).toBeNull();
        expect(storage.get(SHOW_ONLY_SELECTED_FIELDS)).toBe(true);

        await user.click(showOnlySelectedFieldsSwitch);

        expect(screen.getByText('@timestamp')).toBeInTheDocument();
        expect(screen.getByText('bytes')).toBeInTheDocument();
        expect(screen.getByText('extension.keyword')).toBeInTheDocument();
        expect(storage.get(SHOW_ONLY_SELECTED_FIELDS)).toBe(false);
      });

      it('should show multiple selected columns plus timestamp when switch is on', async () => {
        storage.set(SHOW_ONLY_SELECTED_FIELDS, true);

        setupComponent({ columns: ['bytes', 'extension.keyword'], filter: jest.fn() });

        expect(screen.getByText('@timestamp')).toBeInTheDocument();
        expect(screen.getByText('bytes')).toBeInTheDocument();
        expect(screen.getByText('extension.keyword')).toBeInTheDocument();

        const fieldOrder = Array.from(document.querySelectorAll('.kbnDocViewer__fieldName')).map(
          (el) => el.textContent?.trim() ?? ''
        );
        // Only the three selected/timestamp fields should appear
        expect(fieldOrder).toEqual(
          expect.arrayContaining(['@timestamp', 'bytes', 'extension.keyword'])
        );
        expect(fieldOrder).toHaveLength(3);
      });

      it('should move pinned field to top when show only selected is on', async () => {
        storage.set(SHOW_ONLY_SELECTED_FIELDS, true);
        storage.set('discover:pinnedFields', { test: ['extension.keyword'] });

        setupComponent({ columns: ['bytes', 'extension.keyword'], filter: jest.fn() });

        const fieldOrder = Array.from(document.querySelectorAll('.kbnDocViewer__fieldName')).map(
          (el) => el.textContent?.trim() ?? ''
        );

        // Pinned field moves to the top of the visible list
        expect(fieldOrder[0]).toBe('extension.keyword');
        expect(fieldOrder).toContain('@timestamp');
        expect(fieldOrder).toContain('bytes');
      });

      it('should keep pinned field at top after toggling switch off', async () => {
        storage.set(SHOW_ONLY_SELECTED_FIELDS, true);
        storage.set('discover:pinnedFields', { test: ['bytes'] });

        const { user } = setupComponent({
          columns: ['bytes', 'extension.keyword'],
          filter: jest.fn(),
        });

        // Verify initial state: bytes is pinned and at the top
        let fieldOrder = Array.from(document.querySelectorAll('.kbnDocViewer__fieldName')).map(
          (el) => el.textContent?.trim() ?? ''
        );
        expect(fieldOrder[0]).toBe('bytes');

        // Toggle the switch OFF
        await user.click(screen.getByTestId('unifiedDocViewerShowOnlySelectedFieldsSwitch'));

        // After toggling OFF, bytes should still be first (pinned), and all fields visible
        fieldOrder = Array.from(document.querySelectorAll('.kbnDocViewer__fieldName')).map(
          (el) => el.textContent?.trim() ?? ''
        );
        expect(fieldOrder[0]).toBe('bytes');
        expect(fieldOrder).toContain('@timestamp');
        expect(fieldOrder).toContain('extension.keyword');
      });
    });

    describe('when there is no filter function', () => {
      it('should not render the switch', () => {
        setupComponent({ columns: ['bytes'] });

        expect(
          screen.queryByTestId('unifiedDocViewerShowOnlySelectedFieldsSwitch')
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('switch - hide null values', () => {
    const dataViewWithNullableFields = createStubDataView({
      spec: {
        id: 'test-nullable',
        title: 'test-nullable',
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
          message: {
            name: 'message',
            type: 'string',
            esTypes: ['text'],
            aggregatable: false,
            searchable: true,
            count: 10,
            readFromDocValues: false,
            scripted: false,
            isMapped: true,
          },
          'optional.field': {
            name: 'optional.field',
            type: 'string',
            esTypes: ['keyword'],
            aggregatable: true,
            searchable: true,
            count: 0,
            readFromDocValues: true,
            scripted: false,
            isMapped: true,
          },
          'another.nullable': {
            name: 'another.nullable',
            type: 'number',
            esTypes: ['long'],
            aggregatable: true,
            searchable: true,
            count: 0,
            readFromDocValues: true,
            scripted: false,
            isMapped: true,
          },
        },
      },
    });

    const hitWithNullValues = buildDataTableRecord(
      {
        _index: 'test-nullable',
        _id: '1',
        _score: 1,
        _source: {
          '@timestamp': '2024-01-01T00:00:00.000Z',
          message: 'test message',
          'optional.field': null,
          'another.nullable': null,
        },
      },
      dataViewWithNullableFields
    );

    const setupNullableComponent = (
      props: Partial<React.ComponentProps<typeof DocViewerTable>> = {}
    ) => {
      const user = userEvent.setup();

      render(
        <IntlProvider locale="en">
          <DocViewerTable
            dataView={dataViewWithNullableFields}
            hit={hitWithNullValues}
            columns={[]}
            {...props}
          />
        </IntlProvider>
      );

      return { user };
    };

    beforeEach(() => {
      storage.clear();
    });

    it('should render the switch', () => {
      setupNullableComponent();

      expect(screen.getByTestId('unifiedDocViewerHideNullValuesSwitch')).toBeInTheDocument();
    });

    it('should show all fields including those with null values by default', () => {
      setupNullableComponent();

      expect(screen.getByText('@timestamp')).toBeInTheDocument();
      expect(screen.getByText('message')).toBeInTheDocument();
      expect(screen.getByText('optional.field')).toBeInTheDocument();
      expect(screen.getByText('another.nullable')).toBeInTheDocument();
    });

    it('should hide fields with null values when toggled on', async () => {
      const { user } = setupNullableComponent();

      expect(screen.getByText('@timestamp')).toBeInTheDocument();
      expect(screen.getByText('message')).toBeInTheDocument();
      expect(screen.getByText('optional.field')).toBeInTheDocument();
      expect(screen.getByText('another.nullable')).toBeInTheDocument();

      const hideNullValuesSwitch = screen.getByTestId('unifiedDocViewerHideNullValuesSwitch');
      await user.click(hideNullValuesSwitch);

      expect(screen.getByText('@timestamp')).toBeInTheDocument();
      expect(screen.getByText('message')).toBeInTheDocument();
      expect(screen.queryByText('optional.field')).toBeNull();
      expect(screen.queryByText('another.nullable')).toBeNull();
    });

    it('should persist state to localStorage', async () => {
      const { user } = setupNullableComponent();

      expect(storage.get(HIDE_NULL_VALUES)).toBeFalsy();

      const hideNullValuesSwitch = screen.getByTestId('unifiedDocViewerHideNullValuesSwitch');
      await user.click(hideNullValuesSwitch);

      expect(storage.get(HIDE_NULL_VALUES)).toBe(true);

      await user.click(hideNullValuesSwitch);

      expect(storage.get(HIDE_NULL_VALUES)).toBe(false);
    });

    it('should hide fields with null values if it was previously switched on', () => {
      storage.set(HIDE_NULL_VALUES, true);

      setupNullableComponent();

      expect(screen.getByText('@timestamp')).toBeInTheDocument();
      expect(screen.getByText('message')).toBeInTheDocument();
      expect(screen.queryByText('optional.field')).toBeNull();
      expect(screen.queryByText('another.nullable')).toBeNull();
    });
  });

  describe('filter by field type', () => {
    it('should keep pinned fields visible even when their type is filtered out', () => {
      // Pre-seed: only "number" type selected, and "extension.keyword" (keyword) is pinned.
      // The data view id is "test" (see createStubDataView above).
      storage.set('discover:pinnedFields', { test: ['extension.keyword'] });
      storage.set(LOCAL_STORAGE_KEY_SELECTED_FIELD_TYPES, '["number"]');

      setupComponent();

      // bytes (number) passes the type filter → visible as a regular row
      expect(screen.getByText('bytes')).toBeInTheDocument();
      // extension.keyword (keyword) would be filtered out, but it is pinned →
      // the bypass at table.tsx:278 keeps it visible
      expect(screen.getByText('extension.keyword')).toBeInTheDocument();
      // @timestamp (date) fails the type filter and is not pinned → hidden
      expect(screen.queryByText('@timestamp')).toBeNull();
    });
  });
});
