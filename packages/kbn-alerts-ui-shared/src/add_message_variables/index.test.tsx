/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import { AddMessageVariables } from '.';

describe('AddMessageVariables', () => {
  test('it renders variables and filter bar', async () => {
    render(
      <AddMessageVariables
        messageVariables={[
          {
            name: 'myVar',
            description: 'My variable description',
          },
          {
            name: 'myVar2',
            description: 'This variable is deprecated',
          },
        ]}
        paramsProperty="foo"
        onSelectEventHandler={jest.fn()}
      />
    );

    fireEvent.click(await screen.findByTestId('fooAddVariableButton'));
    expect(screen.getByPlaceholderText('Filter options')).toBeInTheDocument();
    expect(screen.getByTestId('myVar-selectableOption')).toBeInTheDocument();
    expect(screen.getByTestId('myVar2-selectableOption')).toBeInTheDocument();
  });

  test('it renders variables title and description', async () => {
    render(
      <AddMessageVariables
        messageVariables={[
          {
            name: 'myVar',
            description: 'My variable description ',
          },
        ]}
        paramsProperty="foo"
        onSelectEventHandler={jest.fn()}
      />
    );

    fireEvent.click(await screen.findByTestId('fooAddVariableButton'));
    expect(screen.getByText('myVar')).toBeInTheDocument();
    expect(screen.getByText('My variable description')).toBeInTheDocument();
  });

  test('it renders tooltip when click on variable', async () => {
    render(
      <AddMessageVariables
        messageVariables={[
          {
            name: 'myVar',
            description: 'My variable description ',
          },
        ]}
        paramsProperty="foo"
        onSelectEventHandler={jest.fn()}
      />
    );

    fireEvent.click(await screen.findByTestId('fooAddVariableButton'));
    fireEvent.mouseOver(screen.getByText('My variable description'));
    expect(await screen.findByTestId('myVar-tooltip')).toBeInTheDocument();
  });

  test('onSelectEventHandler is called with proper action variable', async () => {
    const onSelectEventHandler = jest.fn();
    render(
      <AddMessageVariables
        messageVariables={[
          {
            name: 'myVar1',
            description: 'My variable 1 description',
            useWithTripleBracesInTemplates: true,
          },
          {
            name: 'myVar2',
            description: 'My variable 2 description',
            useWithTripleBracesInTemplates: true,
          },
        ]}
        paramsProperty="foo"
        onSelectEventHandler={onSelectEventHandler}
      />
    );

    fireEvent.click(await screen.findByTestId('fooAddVariableButton'));
    fireEvent.click(screen.getByTestId('myVar2-selectableOption'));

    expect(onSelectEventHandler).toHaveBeenCalledTimes(1);
    expect(onSelectEventHandler).toHaveBeenCalledWith({
      name: 'myVar2',
      description: 'My variable 2 description',
      useWithTripleBracesInTemplates: true,
    });
  });

  test('it renders deprecated variables as disabled', async () => {
    render(
      <AddMessageVariables
        messageVariables={[
          {
            name: 'myVar',
            description: 'My variable description',
          },
          {
            name: 'deprecatedVar',
            description: 'This variable is deprecated',
            deprecated: true,
          },
        ]}
        paramsProperty="foo"
        onSelectEventHandler={jest.fn()}
      />
    );

    fireEvent.click(await screen.findByTestId('fooAddVariableButton'));
    fireEvent.click(screen.getByText('Show all'));
    expect(screen.queryByTestId('myVar-selectableOption')).toBeInTheDocument();
    expect(screen.queryByTestId('deprecatedVar-selectableOption')).toBeInTheDocument();
  });

  test(`it does't render when no variables exist`, async () => {
    render(
      <AddMessageVariables
        messageVariables={[]}
        paramsProperty="foo"
        onSelectEventHandler={jest.fn()}
      />
    );

    expect(screen.queryByTestId('fooAddVariableButton')).not.toBeInTheDocument();
  });

  test('it renders button title when passed', async () => {
    render(
      <AddMessageVariables
        messageVariables={[
          {
            name: 'myVar',
            description: 'My variable description',
          },
        ]}
        paramsProperty="foo"
        onSelectEventHandler={jest.fn()}
        showButtonTitle
      />
    );

    expect(await screen.findByText('Add variable')).toBeInTheDocument();
  });
});
