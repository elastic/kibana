/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { type PropsWithChildren } from 'react';
import { render, screen } from '@testing-library/react';
import type { ESQLStatsQueryMeta } from '@kbn/esql-utils';
import { DiscoverTestProvider } from '../../../../../../__mocks__/test_provider';
import { createDiscoverServicesMock } from '../../../../../../__mocks__/services';
import type { ESQLDataGroupNode } from './types';
import { useEsqlDataCascadeRowHeaderComponents } from './use_row_header_components';

const services = createDiscoverServicesMock();

const TestProvider = ({ children }: PropsWithChildren) => (
  <DiscoverTestProvider services={services}>{children}</DiscoverTestProvider>
);

const queryMeta: ESQLStatsQueryMeta = {
  groupByFields: [{ field: 'category', type: 'column' }],
  appliedFunctions: [{ identifier: 'host', aggregation: 'values' }],
};

const rowData: ESQLDataGroupNode = {
  id: 'row-1',
  groupColumn: 'category',
  groupValue: 'category-a',
  aggregatedValues: {
    host: [0, '', 'host-1'],
  },
};

const TestComponent = () => {
  const { rowHeaderMeta } = useEsqlDataCascadeRowHeaderComponents(
    queryMeta,
    ['host'],
    function () {},
    new Map([['host', 'array']])
  );

  return rowHeaderMeta({ rowDepth: 0, rowData, nodePath: ['category'] });
};

describe('useEsqlDataCascadeRowHeaderComponents', () => {
  it('renders numeric zero values in array aggregations without losing blank placeholders', () => {
    render(<TestComponent />, { wrapper: TestProvider });

    expect(screen.getByText('0, (blank), host-1')).toBeInTheDocument();
  });
});
