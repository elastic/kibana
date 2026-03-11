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
import type { ContentListItem } from '@kbn/content-list-provider';
import { NameCellDescription } from './cell_description';

const createItem = (overrides?: Partial<ContentListItem>): ContentListItem => ({
  id: '1',
  title: 'Test Item',
  ...overrides,
});

describe('NameCellDescription', () => {
  it('renders the description when present', () => {
    render(<NameCellDescription item={createItem({ description: 'Item description' })} />);

    expect(screen.getByText('Item description')).toBeInTheDocument();
  });

  it('returns null when the description is undefined', () => {
    const { container } = render(
      <NameCellDescription item={createItem({ description: undefined })} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('returns null when the description is empty string', () => {
    const { container } = render(<NameCellDescription item={createItem({ description: '' })} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the description inside a paragraph element', () => {
    render(<NameCellDescription item={createItem({ description: 'Test text' })} />);

    const paragraph = screen.getByText('Test text');
    expect(paragraph.tagName).toBe('P');
  });
});
