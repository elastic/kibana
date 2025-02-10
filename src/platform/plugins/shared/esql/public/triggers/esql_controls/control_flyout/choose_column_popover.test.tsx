/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChooseColumnPopover } from './choose_column_popover';

describe('ChooseColumnPopover', () => {
  it('should render a search input and a list', () => {
    render(<ChooseColumnPopover columns={['col1', 'col2']} updateQuery={jest.fn()} />);
    // open the popover
    screen.getByTestId('chooseColumnBtn').click();
    // expect the search input to be rendered
    expect(screen.getByTestId('selectableColumnSearch')).toBeInTheDocument();
    expect(screen.getByTestId('selectableColumnList')).toBeInTheDocument();
  });

  it('should update the list when there is a text in the input', () => {
    render(<ChooseColumnPopover columns={['col1', 'col2']} updateQuery={jest.fn()} />);
    // open the popover
    screen.getByTestId('chooseColumnBtn').click();
    // expect the search input to be rendered

    // type in the search input
    const input = screen.getByTestId('selectableColumnSearch');
    fireEvent.change(input, { target: { value: 'col2' } });

    // get the list
    const list = screen.getByTestId('selectableColumnList');
    const listItems = list.querySelector('li');
    expect(listItems).toHaveTextContent('col2');
  });

  it('should call the updateQuery prop if a list item is clicked', () => {
    const updateQuerySpy = jest.fn();
    render(<ChooseColumnPopover columns={['col1', 'col2']} updateQuery={updateQuerySpy} />);
    // open the popover
    screen.getByTestId('chooseColumnBtn').click();
    // expect the search input to be rendered

    // type in the search input
    const input = screen.getByTestId('selectableColumnSearch');
    fireEvent.change(input, { target: { value: 'col2' } });

    const list = screen.getByTestId('selectableColumnList');
    const listItems = list.querySelector('li');

    // click the list item
    if (listItems) fireEvent.click(listItems);
    expect(updateQuerySpy).toHaveBeenCalledWith('col2');
  });
});
