/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { TableActions } from './table_cell_actions';
import { DataViewField } from '@kbn/data-views-plugin/common';

describe('TableActions', () => {
  it('should render the panels correctly for undefined onFilter function', () => {
    render(
      <TableActions
        mode="inline"
        field="message"
        pinned={false}
        fieldMapping={undefined}
        flattenedField="message"
        onFilter={undefined}
        onToggleColumn={jest.fn()}
        ignoredValue={false}
        onTogglePinned={jest.fn()}
      />
    );
    expect(screen.queryByTestId('addFilterForValueButton-message')).not.toBeInTheDocument();
    expect(screen.queryByTestId('addFilterOutValueButton-message')).not.toBeInTheDocument();
    expect(screen.queryByTestId('addExistsFilterButton-message')).not.toBeInTheDocument();
    expect(screen.getByTestId('toggleColumnButton-message')).not.toBeDisabled();
    expect(screen.getByTestId('togglePinFilterButton-message')).not.toBeDisabled();
  });

  it('should render the panels correctly for defined onFilter function', () => {
    render(
      <TableActions
        mode="inline"
        field="message"
        pinned={false}
        fieldMapping={
          {
            name: 'message',
            type: 'string',
            filterable: true,
          } as DataViewField
        }
        flattenedField="message"
        onFilter={jest.fn()}
        onToggleColumn={jest.fn()}
        ignoredValue={false}
        onTogglePinned={jest.fn()}
      />
    );
    expect(screen.getByTestId('addFilterForValueButton-message')).not.toBeDisabled();
    expect(screen.getByTestId('addFilterOutValueButton-message')).not.toBeDisabled();
    expect(screen.getByTestId('addExistsFilterButton-message')).not.toBeDisabled();
    expect(screen.getByTestId('toggleColumnButton-message')).not.toBeDisabled();
    expect(screen.getByTestId('togglePinFilterButton-message')).not.toBeDisabled();
  });
});
