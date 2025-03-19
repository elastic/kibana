/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import React from 'react';
import { DimensionButton, DimensionButtonProps } from './dimension_button';

describe('DimensionButton', () => {
  function getDefaultProps(): Omit<DimensionButtonProps, 'label' | 'children'> {
    return {
      groupLabel: 'myGroup',
      onClick: jest.fn(),
      onRemoveClick: jest.fn(),
      accessorConfig: { columnId: '1' },
      message: undefined,
    };
  }
  it('should fallback to the empty title if the dimension label is made of an empty string', () => {
    render(
      <DimensionButton {...getDefaultProps()} label="">
        <div />
      </DimensionButton>
    );
    expect(screen.getByTitle('Edit [Untitled] configuration')).toBeInTheDocument();
  });

  it('should fallback to the empty title if the dimension label is made up of whitespaces only', () => {
    render(
      <DimensionButton {...getDefaultProps()} label="     ">
        <div />
      </DimensionButton>
    );
    expect(screen.getByTitle('Edit [Untitled] configuration')).toBeInTheDocument();
  });

  it('should not fallback to the empty title if the dimension label has also valid chars beside whitespaces', () => {
    render(
      <DimensionButton {...getDefaultProps()} label="aaa     ">
        <div />
      </DimensionButton>
    );
    expect(screen.getByTitle('Edit aaa configuration')).toBeInTheDocument();
  });
});
