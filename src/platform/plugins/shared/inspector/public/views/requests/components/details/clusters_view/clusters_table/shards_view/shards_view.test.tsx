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
import type { estypes } from '@elastic/elasticsearch';
import { ShardsView } from './shards_view';

describe('render', () => {
  test('should render with no failures', () => {
    const shardStats: estypes.ShardStatistics = {
      total: 2,
      successful: 2,
      skipped: 0,
      failed: 0,
    };

    render(<ShardsView failures={[]} shardStats={shardStats} />);

    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent(/shards/i);
    expect(screen.getByText(/2 total shards/i)).toBeInTheDocument();
    expect(screen.getByText(/2 of 2 successful/i)).toBeInTheDocument();
  });

  test('should render with failures', () => {
    const shardStats: estypes.ShardStatistics = {
      total: 2,
      successful: 1,
      skipped: 0,
      failed: 1,
    };

    render(
      <ShardsView failures={[{} as unknown as estypes.ShardFailure]} shardStats={shardStats} />
    );

    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent(/shards/i);
    expect(screen.getByText(/2 total shards/i)).toBeInTheDocument();
    expect(screen.getByText(/1 of 2 successful/i)).toBeInTheDocument();
    // Assuming the flyout button renders visibly, you can assert it like:
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  test('should not render when no shard details are provided', () => {
    const { container } = render(<ShardsView failures={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
