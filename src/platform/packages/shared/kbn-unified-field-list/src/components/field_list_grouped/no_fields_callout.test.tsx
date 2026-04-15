/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { NoFieldsCallout } from './no_fields_callout';
import { render, screen } from '@testing-library/react';

describe('UnifiedFieldList <NoFieldCallout />', () => {
  it('renders correctly for index with no fields', () => {
    render(<NoFieldsCallout fieldsExistInIndex={false} />);

    expect(screen.getByText('No fields exist in this data view.')).toBeVisible();
  });

  it('renders correctly when empty with no filters/timerange reasons', () => {
    render(<NoFieldsCallout fieldsExistInIndex={true} />);

    expect(screen.getByText('There are no fields.')).toBeVisible();
  });

  it('renders correctly with passed defaultNoFieldsMessage', () => {
    render(<NoFieldsCallout fieldsExistInIndex={true} defaultNoFieldsMessage="No empty fields" />);

    expect(screen.getByText('No empty fields')).toBeVisible();
  });

  it('renders properly when affected by field filter', () => {
    render(<NoFieldsCallout fieldsExistInIndex={true} isAffectedByFieldFilter={true} />);

    expect(screen.getByText('No fields match the selected filters.')).toBeVisible();
    expect(screen.getByText('Try:')).toBeVisible();
    expect(screen.getByText('Using different field filters')).toBeVisible();
  });

  it('renders correctly when affected by global filters and timerange', () => {
    render(
      <NoFieldsCallout
        fieldsExistInIndex={true}
        isAffectedByTimerange={true}
        isAffectedByGlobalFilter={true}
        defaultNoFieldsMessage="There are no available fields that contain data."
      />
    );

    expect(screen.getByText('There are no available fields that contain data.')).toBeVisible();
    expect(screen.getByText('Try:')).toBeVisible();
    expect(screen.getByText('Extending the time range')).toBeVisible();
    expect(screen.getByText('Changing the global filters')).toBeVisible();
  });

  it('renders correctly when affected by global filters and field filters', () => {
    render(
      <NoFieldsCallout
        fieldsExistInIndex={true}
        isAffectedByTimerange={true}
        isAffectedByFieldFilter={true}
        defaultNoFieldsMessage="There are no available fields that contain data."
      />
    );

    expect(screen.getByText('No fields match the selected filters.')).toBeVisible();
    expect(screen.getByText('Try:')).toBeVisible();
    expect(screen.getByText('Extending the time range')).toBeVisible();
    expect(screen.getByText('Using different field filters')).toBeVisible();
  });

  it('renders correctly when affected by field filters, global filter and timerange', () => {
    render(
      <NoFieldsCallout
        fieldsExistInIndex={true}
        isAffectedByFieldFilter={true}
        isAffectedByTimerange={true}
        isAffectedByGlobalFilter={true}
        defaultNoFieldsMessage={`doesn't exist`}
      />
    );

    expect(screen.getByText('No fields match the selected filters.')).toBeVisible();
    expect(screen.getByText('Try:')).toBeVisible();
    expect(screen.getByText('Extending the time range')).toBeVisible();
    expect(screen.getByText('Using different field filters')).toBeVisible();
    expect(screen.getByText('Changing the global filters')).toBeVisible();
  });
});
