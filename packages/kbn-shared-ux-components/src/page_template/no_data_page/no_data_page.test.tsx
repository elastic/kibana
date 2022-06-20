/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { NoDataPage } from './no_data_page';
import { renderWithIntl } from '@kbn/test-jest-helpers';
import { NoDataCard } from '@kbn/shared-ux-card-no-data';
import { SharedUxServicesProvider, mockServicesFactory } from '@kbn/shared-ux-services';

describe('NoDataPage', () => {
  test('render', () => {
    const component = renderWithIntl(
      <SharedUxServicesProvider {...mockServicesFactory()}>
        <NoDataPage
          solution="Analytics"
          action={{
            elasticAgent: {},
          }}
          logo={'logoKibana'}
          docsLink="test"
        />
      </SharedUxServicesProvider>
    );
    expect(component).toMatchSnapshot();
    expect(component.find('h1').html()).toContain('Welcome to Elastic Analytics!');
    expect(component.find(NoDataCard).length).toBe(1);
  });
});
