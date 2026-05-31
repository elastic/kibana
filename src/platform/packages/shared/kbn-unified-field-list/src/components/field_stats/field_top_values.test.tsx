/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { FieldTopValuesProps } from './field_top_values';
import React from 'react';
import userEvent from '@testing-library/user-event';
import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { EMPTY_LABEL } from '@kbn/field-formats-common';
import { FieldTopValues } from './field_top_values';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';

const expectTopValueProgress = (label: string, percentage: string) => {
  expect(screen.getByRole('progressbar', { name: label })).toHaveAttribute(
    'aria-valuetext',
    percentage
  );
};

describe('UnifiedFieldList <FieldTopValues />', () => {
  let defaultProps: FieldTopValuesProps;

  beforeEach(() => {
    defaultProps = {
      areExamples: false,
      buckets: [
        {
          count: 500,
          key: 'sourceA',
        },
        {
          count: 1,
          key: 'sourceB',
        },
      ],
      color: '#000',
      'data-test-subj': 'testing',
      dataView: dataViewMock,
      field: dataViewMock.getFieldByName('extension')!,
      sampledValuesCount: 5000,
    };
  });

  it('should render correctly without filter actions', () => {
    renderWithI18n(<FieldTopValues {...defaultProps} />);

    expectTopValueProgress('sourceA', '10.0%');
    expectTopValueProgress('sourceB', '0.0%');
    expectTopValueProgress('Other', '90.0%');

    expect(screen.getAllByRole('progressbar')).toHaveLength(3);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('should render correctly with filter actions', async () => {
    const mockAddFilter = jest.fn();

    renderWithI18n(<FieldTopValues {...defaultProps} onAddFilter={mockAddFilter} />);

    expectTopValueProgress('sourceA', '10.0%');
    expectTopValueProgress('sourceB', '0.0%');
    expectTopValueProgress('Other', '90.0%');

    expect(screen.getAllByRole('progressbar')).toHaveLength(3);
    expect(screen.getAllByRole('button')).toHaveLength(4);

    await userEvent.click(screen.getByRole('button', { name: 'Filter for extension: "sourceA"' }));

    expect(mockAddFilter).toHaveBeenCalledWith(defaultProps.field, 'sourceA', '+');
  });

  it('should render correctly without Other section', () => {
    renderWithI18n(
      <FieldTopValues
        {...defaultProps}
        buckets={[
          {
            count: 3000,
            key: 'sourceA',
          },
          {
            count: 1500,
            key: 'sourceB',
          },
          {
            count: 500,
            key: 'sourceC',
          },
        ]}
      />
    );

    expectTopValueProgress('sourceA', '60.0%');
    expectTopValueProgress('sourceB', '30.0%');
    expectTopValueProgress('sourceC', '10.0%');

    expect(screen.queryByText('Other')).not.toBeInTheDocument();
  });

  it('should render correctly with empty strings', () => {
    renderWithI18n(
      <FieldTopValues
        {...defaultProps}
        buckets={[
          {
            count: 3000,
            key: '',
          },
          {
            count: 1500,
            key: 'sourceA',
          },
          {
            count: 20,
            key: 'sourceB',
          },
        ]}
      />
    );

    expectTopValueProgress(EMPTY_LABEL, '60.0%');
    expectTopValueProgress('sourceA', '30.0%');
    expectTopValueProgress('sourceB', '0.4%');
    expectTopValueProgress('Other', '9.6%');
  });

  it('should render correctly without floating point', () => {
    renderWithI18n(
      <FieldTopValues
        {...defaultProps}
        buckets={[
          {
            count: 5000,
            key: 'sourceA',
          },
        ]}
      />
    );

    expectTopValueProgress('sourceA', '100%');
  });
});
