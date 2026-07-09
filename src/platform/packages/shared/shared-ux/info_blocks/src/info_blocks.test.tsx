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
import { InfoBlocks, getInfoBlocksColumnCount } from './info_blocks.component';

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
});

describe('getInfoBlocksColumnCount (responsive 3 -> 2 -> 1)', () => {
  const MANY = 6; // more items than the column maximum

  it('uses 3 columns when every block stays at/above 140px', () => {
    expect(getInfoBlocksColumnCount(500, MANY)).toBe(3);
    expect(getInfoBlocksColumnCount(420, MANY)).toBe(3); // exactly 3 * 140
  });

  it('drops to 2 columns once a third block would fall below 140px', () => {
    expect(getInfoBlocksColumnCount(419, MANY)).toBe(2);
    expect(getInfoBlocksColumnCount(280, MANY)).toBe(2); // exactly 2 * 140
  });

  it('drops to 1 column once a second block would fall below 140px', () => {
    expect(getInfoBlocksColumnCount(279, MANY)).toBe(1);
    expect(getInfoBlocksColumnCount(140, MANY)).toBe(1);
  });

  it('never returns fewer than 1 column at tiny widths', () => {
    expect(getInfoBlocksColumnCount(50, MANY)).toBe(1);
  });

  it('assumes the maximum when the width is unknown (0, pre-measurement)', () => {
    expect(getInfoBlocksColumnCount(0, MANY)).toBe(3);
    expect(getInfoBlocksColumnCount(0, 2)).toBe(2);
  });

  it('never exceeds the 3-column maximum however wide', () => {
    expect(getInfoBlocksColumnCount(2000, MANY)).toBe(3);
  });

  it('never uses more columns than there are items', () => {
    expect(getInfoBlocksColumnCount(2000, 2)).toBe(2);
    expect(getInfoBlocksColumnCount(2000, 1)).toBe(1);
  });
});
