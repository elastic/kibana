/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { createStubDataView } from '@kbn/data-views-plugin/common/data_views/data_view.stub';
import { FieldNumberSummary } from './field_number_summary';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen, within } from '@testing-library/react';

const dataView = createStubDataView({
  spec: {
    fields: {
      bytes_counter: {
        aggregatable: true,
        count: 10,
        esTypes: ['long'],
        isMapped: true,
        name: 'bytes_counter',
        readFromDocValues: true,
        scripted: false,
        searchable: true,
        timeSeriesMetric: 'counter',
        type: 'number',
      },
    },
    id: 'test',
    title: 'test',
  },
});

describe('UnifiedFieldList <FieldNumberSummary />', () => {
  it('should render min and max correctly', () => {
    renderWithI18n(
      <FieldNumberSummary
        data-test-subj="test-subj"
        dataView={dataView}
        field={dataView.getFieldByName('bytes_counter')!}
        numberSummary={{
          maxValue: 12345,
          minValue: 45,
        }}
      />
    );

    const summary = screen.getByTestId('test-subj-numberSummary');
    expect(within(summary).getByText('min')).toBeVisible();
    expect(within(summary).getByText('45')).toBeVisible();
    expect(within(summary).getByText('max')).toBeVisible();
    expect(within(summary).getByText('12345')).toBeVisible();
  });

  it('should not fail if data is invalid', () => {
    renderWithI18n(
      <FieldNumberSummary
        data-test-subj="test-subj"
        dataView={dataView}
        field={dataView.getFieldByName('bytes_counter')!}
        numberSummary={undefined}
      />
    );

    expect(screen.queryByTestId('test-subj-numberSummary')).not.toBeInTheDocument();
  });
});
