/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { mountWithIntl } from '@kbn/test-jest-helpers';

import { getNoDataConfigPageServicesMock } from '@kbn/shared-ux-page-no-data-config-mocks';

import { NoDataConfigPage } from './no_data_config_page';
import { NoDataConfigPageProvider } from './services';

describe('NoDataConfigPage', () => {
  const noDataConfig = {
    solution: 'Solution',
    logo: 'logoKibana',
    docsLink: 'test-link',
    action: {
      kibana: {
        button: 'Click me',
        onClick: jest.fn(),
        description: 'Page with no data',
      },
    },
  };
  test('renders', () => {
    const component = mountWithIntl(
      <NoDataConfigPageProvider {...getNoDataConfigPageServicesMock()}>
        <NoDataConfigPage noDataConfig={noDataConfig} />
      </NoDataConfigPageProvider>
    );
    expect(component.find('h1').html()).toContain('Welcome to Elastic Solution!');
    expect(component.find('a[data-test-subj="noDataDefaultFooterAction"]').html()).toContain(
      'Click me'
    );
  });
});
