/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { Suspense } from 'react';
import { getTableViewDescription } from '../index';
import { mountWithIntl } from '@kbn/test/jest';
import { TablesAdapter } from '../../../../../expressions/common';

jest.mock('./export_csv', () => ({
  exportAsCsv: jest.fn(),
}));

describe('Inspector Data View', () => {
  let DataView: any;

  beforeEach(() => {
    DataView = getTableViewDescription(() => ({
      uiActions: {} as any,
      uiSettings: {} as any,
      fieldFormats: {} as any,
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
  });
});
