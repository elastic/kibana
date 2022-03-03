/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Suspense } from 'react';
import { getTableViewDescription } from '../index';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { TablesAdapter } from '../../../../../expressions/common';

jest.mock('../../../../../share/public', () => ({
  downloadMultipleAs: jest.fn(),
}));
jest.mock('../../../../common', () => ({
  datatableToCSV: jest.fn().mockReturnValue('csv'),
  tableHasFormulas: jest.fn().mockReturnValue(false),
}));

describe('Inspector Data View', () => {
  let DataView: any;

  beforeEach(() => {
    DataView = getTableViewDescription(() => ({
      uiActions: {} as any,
      uiSettings: { get: (key: string, value: string) => value } as any,
      fieldFormats: {
        deserialize: jest.fn().mockReturnValue({ convert: (v: string) => v }),
      } as any,
      isFilterable: jest.fn(),
    }));
  });

  it('should only show if data adapter is present', () => {
    const adapter = new TablesAdapter();

    expect(DataView.shouldShow({ tables: adapter })).toBe(true);
    expect(DataView.shouldShow({})).toBe(false);
  });

  describe('component', () => {
    let adapters: any;

    beforeEach(() => {
      adapters = { tables: new TablesAdapter() };
    });

    it('should render loading state', () => {
      const DataViewComponent = DataView.component;
      const component = mountWithIntl(
        <Suspense fallback={<div>loading</div>}>
          <DataViewComponent title="Test Data" adapters={adapters} />
        </Suspense>
      );

      expect(component).toMatchSnapshot();
    });

    it('should render empty state', async () => {
      const component = mountWithIntl(<DataView.component title="Test Data" adapters={adapters} />); // eslint-disable-line react/jsx-pascal-case
      adapters.tables.logDatatable({ columns: [{ id: '1' }], rows: [{ '1': 123 }] });
      // After the loader has resolved we'll still need one update, to "flush" the state changes
      component.update();
      expect(component).toMatchSnapshot();
    });

    it('should render single table without selector', async () => {
      const component = mountWithIntl(
        // eslint-disable-next-line react/jsx-pascal-case
        <DataView.component title="Test Data" adapters={adapters} />
      );
      adapters.tables.logDatatable('table1', {
        columns: [{ id: '1', name: 'column1', meta: { type: 'number' } }],
        rows: [{ '1': 123 }],
        type: 'datatable',
      });
      // After the loader has resolved we'll still need one update, to "flush" the state changes
      component.update();
      expect(component.find('[data-test-subj="inspectorDataViewSelectorLabel"]')).toHaveLength(0);

      expect(component).toMatchSnapshot();
    });

    it('should support multiple datatables', async () => {
      const multitableAdapter = { tables: new TablesAdapter() };

      const component = mountWithIntl(
        // eslint-disable-next-line react/jsx-pascal-case
        <DataView.component title="Test Data" adapters={multitableAdapter} />
      );
      multitableAdapter.tables.logDatatable('table1', {
        columns: [{ id: '1', name: 'column1', meta: { type: 'number' } }],
        rows: [{ '1': 123 }],
        type: 'datatable',
      });
      multitableAdapter.tables.logDatatable('table2', {
        columns: [{ id: '1', name: 'column1', meta: { type: 'number' } }],
        rows: [{ '1': 456 }],
        type: 'datatable',
      });
      // After the loader has resolved we'll still need one update, to "flush" the state changes
      component.update();
      expect(component.find('[data-test-subj="inspectorDataViewSelectorLabel"]')).toHaveLength(1);

      expect(component).toMatchSnapshot();
    });
  });
});
