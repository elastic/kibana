/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';
import { NoDataCard } from '@kbn/shared-ux-card-no-data';
import { getNoDataPageServicesMock } from '@kbn/shared-ux-page-no-data-mocks';

import { NoDataPage } from './no_data_page';
import { NoDataPageProvider } from './services';

describe('NoDataPage', () => {
  test('render', () => {
    const component = mountWithIntl(
      <NoDataPageProvider {...getNoDataPageServicesMock()}>
        <NoDataPage
          solution="Analytics"
          action={{
            elasticAgent: {},
          }}
          logo={'logoKibana'}
          docsLink="test"
        />
      </NoDataPageProvider>
    );
    expect(component.find('h1').html()).toContain('Welcome to Elastic Analytics!');
    expect(component.find(NoDataCard).length).toBe(1);
  });
});
