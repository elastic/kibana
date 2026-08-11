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
import { InfoBlocks, resolveMaxColumns } from './info_blocks.component';

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

describe('resolveMaxColumns', () => {
  it.each([
    [15, 4],
    [14, 3],
    [13, 3],
    [12, 4],
    [11, 4],
    [10, 4],
    [9, 3],
    [8, 4],
    [7, 4],
    [6, 3],
    [5, 3],
    [4, 4],
    [3, 3],
    [2, 2],
    [1, 2],
  ])('resolves %i items to %i columns', (itemCount, expected) => {
    expect(resolveMaxColumns(itemCount)).toBe(expected);
  });

  it('fits small sets on a single row', () => {
    for (const itemCount of [2, 3]) {
      expect(resolveMaxColumns(itemCount)).toBe(itemCount);
    }
  });

  it('never chooses fewer than three columns beyond the single-row sets', () => {
    for (let itemCount = 4; itemCount <= 100; itemCount++) {
      expect(resolveMaxColumns(itemCount)).toBeGreaterThanOrEqual(3);
    }
  });

  it('leaves at most one empty cell except where three columns cannot avoid two', () => {
    // Past the single-row sets, two gaps are unavoidable above two columns at n ≡ 1 or 10 (mod 12).
    const unavoidable = (itemCount: number) => itemCount % 12 === 1 || itemCount % 12 === 10;

    for (let itemCount = 1; itemCount <= 100; itemCount++) {
      const columns = resolveMaxColumns(itemCount);
      const emptyCells = (columns - (itemCount % columns)) % columns;
      expect(emptyCells).toBeLessThanOrEqual(itemCount > 3 && unavoidable(itemCount) ? 2 : 1);
    }
  });

  it('never picks a cap that another would beat on gaps', () => {
    const gaps = (itemCount: number, columns: number) =>
      (columns - (itemCount % columns)) % columns;

    for (let itemCount = 4; itemCount <= 100; itemCount++) {
      const columns = resolveMaxColumns(itemCount);
      // A wider cap is worth one extra gap, but never more than that.
      const alternative = columns === 4 ? 3 : 4;
      expect(gaps(itemCount, columns)).toBeLessThanOrEqual(gaps(itemCount, alternative) + 1);
    }
  });
});
