/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Suspense } from 'react';
import { getDataViewDescription } from '../index';
import { DataAdapter } from '../../../../common/adapters/data';
import { mountWithIntl } from '@kbn/test/jest';

jest.mock('../lib/export_csv', () => ({
  exportAsCsv: jest.fn(),
}));

describe('Inspector Data View', () => {
  let DataView: any;

  beforeEach(() => {
    DataView = getDataViewDescription();
  });

  it('should only show if data adapter is present', () => {
    const adapter = new DataAdapter();

    expect(DataView.shouldShow({ data: adapter })).toBe(true);
    expect(DataView.shouldShow({})).toBe(false);
  });

  describe('component', () => {
    let adapters: any;

    beforeEach(() => {
      adapters = { data: new DataAdapter() };
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
      const tabularLoader = Promise.resolve(null);
      adapters.data.setTabularLoader(() => tabularLoader);
      await tabularLoader;
      // After the loader has resolved we'll still need one update, to "flush" the state changes
      component.update();
      expect(component).toMatchSnapshot();
    });
  });
});
