/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
