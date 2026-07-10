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
import { InfoBlocks, getInfoBlocksColumnCount, getInfoBlocksLayout } from './info_blocks.component';

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

  it('renders no InfoBlock for a leading spacer', () => {
    render(
      <InfoBlocks
        hasLeadingSpacer
        items={[
          { title: 'Risk score', value: '90', size: 'xl' },
          { title: 'Vendor', value: 'Elastic' },
          { title: 'Result', value: 'Success' },
        ]}
      />
    );
    // Only the three real blocks render a block element; the spacer renders none.
    expect(screen.getAllByTestId('infoBlock')).toHaveLength(3);
    expect(screen.getByText('Risk score')).toBeInTheDocument();
    expect(screen.getByText('Vendor')).toBeInTheDocument();
  });

  it('drops the leading spacer when compressed', () => {
    render(
      <InfoBlocks
        data-test-subj="compressedBlocks"
        compressed
        hasLeadingSpacer
        items={[
          { title: 'Risk score', value: '90', size: 'xl' },
          { title: 'Vendor', value: 'Elastic' },
          { title: 'Result', value: 'Success' },
        ]}
      />
    );

    expect(screen.getAllByTestId('infoBlock')).toHaveLength(3);
    expect(screen.getByTestId('compressedBlocks').children).toHaveLength(3);
  });
});

describe('getInfoBlocksLayout (leading-spacer placement + divider hints)', () => {
  const itemCountWithSpacer = 3; // Risk score, Vendor, Result

  it('spans the leading spacer over the single remaining cell at 2 columns', () => {
    const layout = getInfoBlocksLayout(itemCountWithSpacer, 2, true);
    // Risk score occupies cell 1; the spacer fills the rest of row 1 (1 cell).
    expect(layout[0]).toMatchObject({ columnStart: 0, span: 1, isSpacer: false });
    expect(layout[1]).toMatchObject({ columnStart: 1, span: 1, isSpacer: true });
    // The next real block therefore starts on row 2, in column 1.
    expect(layout[2]).toMatchObject({ columnStart: 0, span: 1, isSpacer: false });
    expect(layout[3]).toMatchObject({ columnStart: 1, span: 1, isSpacer: false });
  });

  it('spans the leading spacer over both remaining cells at 3 columns', () => {
    const layout = getInfoBlocksLayout(itemCountWithSpacer, 3, true);
    // Risk score occupies cell 1; the spacer fills the rest of row 1 (2 cells).
    expect(layout[0]).toMatchObject({ columnStart: 0, span: 1, isSpacer: false });
    expect(layout[1]).toMatchObject({ columnStart: 1, span: 2, isSpacer: true });
    // Real content still resumes on row 2.
    expect(layout[2]).toMatchObject({ columnStart: 0, span: 1, isSpacer: false });
    expect(layout[3]).toMatchObject({ columnStart: 1, span: 1, isSpacer: false });
  });

  it('keeps the divider on the block before a leading spacer, and marks the spacer last-column', () => {
    const layout = getInfoBlocksLayout(itemCountWithSpacer, 3, true);
    // The block before the spacer is NOT the last column, so it keeps its
    // inline-end (right-hand) vertical divider.
    expect(layout[0].isLastColumn).toBe(false);
    // The spacer fills the rest of the row, reaching the last column.
    expect(layout[1]).toMatchObject({ isSpacer: true, isLastColumn: true });
  });

  it('marks a row that has real content below it', () => {
    const layout = getInfoBlocksLayout(itemCountWithSpacer, 3, true);
    expect(layout[0].hasRowBelow).toBe(true); // Risk score, row 1 -> row 2 below
    expect(layout[1].hasRowBelow).toBe(true); // spacer shares row 1
    expect(layout[2].hasRowBelow).toBe(false); // last content row
    expect(layout[3].hasRowBelow).toBe(false);
  });

  it('leaves single-column, no-spacer layout unchanged (one span-1 cell per row)', () => {
    const layout = getInfoBlocksLayout(2, 1);
    expect(layout.every((cell) => cell.span === 1 && cell.columnStart === 0)).toBe(true);
    expect(layout[0]).toMatchObject({ isLastColumn: true, hasRowBelow: true });
    expect(layout[1]).toMatchObject({ isLastColumn: true, hasRowBelow: false });
  });

  it('leaves no room for a leading spacer at a single column', () => {
    // The first item already fills the only column, so there's nothing left to
    // reserve for the spacer -- every item still gets its own row.
    const layout = getInfoBlocksLayout(2, 1, true);
    expect(layout).toHaveLength(2);
    expect(layout.every((cell) => !cell.isSpacer)).toBe(true);
  });

  it('preserves the vertical divider beside a partial trailing row (no spacer item)', () => {
    // 3 columns, 5 items: row 2 is [D | E | (absent)]. E is not the last column,
    // so it keeps its inline-end divider even though the trailing cell is absent.
    const layout = getInfoBlocksLayout(5, 3);
    expect(layout[4]).toMatchObject({ columnStart: 1, span: 1, isLastColumn: false });
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
