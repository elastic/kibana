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
import { EuiBadge, EuiLink } from '@elastic/eui';
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

  it('associates each title with its value as a definition list', () => {
    render(
      <MetaBlocks
        items={[
          { title: 'Last updated', value: 'Dec 3, 2025' },
          { title: 'Owner', value: 'Platform' },
        ]}
      />
    );

    expect(screen.getByTestId('metablocks-container').tagName).toBe('DL');
    expect(screen.getAllByRole('term')).toHaveLength(2);
    expect(screen.getAllByRole('definition')).toHaveLength(2);

    // `term` and `definition` take no name from content, so the pairing a screen reader reads out
    // is carried by adjacency alone.
    const term = screen.getByText('Owner');
    expect(term.tagName).toBe('DT');
    expect(term.nextElementSibling?.tagName).toBe('DD');
    expect(term.nextElementSibling).toHaveTextContent('Platform');
  });

  it('wraps each pair in a single element, the only grouping a definition list allows', () => {
    render(
      <MetaBlocks
        items={[
          { title: 'A', value: '1' },
          { title: 'B', value: '2' },
        ]}
      />
    );

    const groups = Array.from(screen.getByTestId('metablocks-container').children);
    expect(groups).toHaveLength(2);
    for (const group of groups) {
      expect(group.tagName).toBe('DIV');
      expect(group.querySelectorAll(':scope > dt')).toHaveLength(1);
      expect(group.querySelectorAll(':scope > dd')).toHaveLength(1);
    }
  });

  it('truncates string values in the middle, keeping the full text available', () => {
    const resource = 'etcd-cspm-control-plane-8fO2b-1a2b3c4d5e6f7g8h9i0j-kube-system';
    render(<MetaBlocks items={[{ title: 'Resource', value: resource }]} />);

    expect(screen.getByTestId('fullText')).toHaveTextContent(resource);
  });

  it('truncates link values in the middle, keeping the link itself accessible', () => {
    const email = 'long-user-name-with-ellipsis@elastic.co';
    render(
      <MetaBlocks
        items={[
          {
            title: 'Last updated by',
            value: (
              <EuiLink href="#" data-test-subj="ownerLink">
                {email}
              </EuiLink>
            ),
          },
        ]}
      />
    );

    expect(screen.getByRole('link', { name: email })).toBeInTheDocument();
    // The sizing copy measures text, so the caller's element is mounted once.
    expect(screen.getByTestId('ownerLink')).toBeInTheDocument();
  });

  it('leaves a link that renders a button untruncated', () => {
    const email = 'long-user-name-with-ellipsis@elastic.co';
    render(
      <MetaBlocks items={[{ title: 'Last updated by', value: <EuiLink>{email}</EuiLink> }]} />
    );

    expect(screen.queryByTestId('fullText')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: email })).toBeInTheDocument();
  });

  it('leaves values that own their layout untruncated', () => {
    render(<MetaBlocks items={[{ title: 'Severity', value: <EuiBadge>Critical</EuiBadge> }]} />);

    expect(screen.queryByTestId('fullText')).not.toBeInTheDocument();
    expect(screen.getByText('Critical')).toBeInTheDocument();
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
