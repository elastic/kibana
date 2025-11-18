/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { getNoDataPageServicesMock } from '@kbn/shared-ux-page-no-data-mocks';

import { NoDataPage } from './no_data_page';
import { NoDataPageProvider } from './services';

describe('NoDataPage', () => {
  test('render', () => {
    render(
      <NoDataPageProvider {...getNoDataPageServicesMock()}>
        <NoDataPage
          action={{
            elasticAgent: {},
          }}
        />
      </NoDataPageProvider>
    );

    // Should render the NoDataPage with its main container
    expect(screen.getByTestId('kbnNoDataPage')).toBeInTheDocument();

    // Should render the NoDataCard component (inherited from ActionCard)
    expect(screen.getByTestId('noDataCard')).toBeInTheDocument();
  });
});
