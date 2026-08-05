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
import { InfoBlocks } from './info_blocks.component';

describe('InfoBlocks', () => {
  it('renders each block title and node value', () => {
    render(
      <InfoBlocks
        items={[
          { title: 'Owner', value: <span>Platform</span> },
          { title: 'Throughput', value: '1.2k tpm' },
        ]}
      />
    );

    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('Platform')).toBeInTheDocument();
    expect(screen.getByText('Throughput')).toBeInTheDocument();
    expect(screen.getByText('1.2k tpm')).toBeInTheDocument();
  });

  it('renders one block element per item', () => {
    render(
      <InfoBlocks
        items={[
          { title: 'A', value: '1' },
          { title: 'B', value: '2' },
          { title: 'C', value: '3' },
        ]}
      />
    );

    expect(screen.getAllByTestId('infoBlock')).toHaveLength(3);
  });

  it('honors a custom data-test-subj on the container', () => {
    render(<InfoBlocks data-test-subj="myBlocks" items={[{ title: 'A', value: '1' }]} />);
    expect(screen.getByTestId('myBlocks')).toBeInTheDocument();
  });

  it('honors a custom data-test-subj on an item', () => {
    render(
      <InfoBlocks items={[{ title: 'Owner', value: 'Platform', 'data-test-subj': 'ownerBlock' }]} />
    );

    expect(screen.getByTestId('ownerBlock')).toBeInTheDocument();
  });

});
