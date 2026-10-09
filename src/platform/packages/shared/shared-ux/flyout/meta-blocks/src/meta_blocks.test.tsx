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
import { MetaBlocks } from '..';

describe('MetaBlocks', () => {
  it('renders each pair title and node value', () => {
    render(
      <MetaBlocks
        items={[
          { title: 'Last updated', value: 'Dec 3, 2025' },
          { title: 'Owner', value: <span>Platform</span> },
        ]}
      />
    );

    expect(screen.getByText('Last updated')).toBeInTheDocument();
    expect(screen.getByTestId('metablocks-container')).toHaveTextContent('Dec 3, 2025');
    expect(screen.getByText('Owner')).toBeInTheDocument();
    expect(screen.getByText('Platform')).toBeInTheDocument();
  });

  it('truncates string values in the middle, keeping the full text available', () => {
    const resource = 'etcd-cspm-control-plane-8fO2b-1a2b3c4d5e6f7g8h9i0j-kube-system';
    render(<MetaBlocks items={[{ title: 'Resource', value: resource }]} />);

    expect(screen.getByTestId('fullText')).toHaveTextContent(resource);
  });

  it('renders nothing when there are no items', () => {
    render(<MetaBlocks items={[]} />);
    expect(screen.queryByTestId('metablocks-container')).not.toBeInTheDocument();
  });

  it('honors a custom data-test-subj on the container', () => {
    render(<MetaBlocks data-test-subj="myPairs" items={[{ title: 'A', value: '1' }]} />);
    expect(screen.getByTestId('myPairs')).toBeInTheDocument();
  });

  it('honors a custom data-test-subj on an item', () => {
    render(
      <MetaBlocks items={[{ title: 'Owner', value: 'Platform', 'data-test-subj': 'ownerPair' }]} />
    );

    expect(screen.getByTestId('ownerPair')).toBeInTheDocument();
  });
});
