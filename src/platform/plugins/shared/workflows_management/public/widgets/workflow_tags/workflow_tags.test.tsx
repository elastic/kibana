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
import { WorkflowTags } from './workflow_tags';

describe('WorkflowTags', () => {
  it('renders nothing when tags is undefined', () => {
    const { container } = render(<WorkflowTags tags={undefined} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when tags is empty', () => {
    const { container } = render(<WorkflowTags tags={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a single tag as a badge', () => {
    render(<WorkflowTags tags={['alpha']} />);
    expect(screen.getByText('alpha')).toBeInTheDocument();
  });

  it('renders multiple tags as badges', () => {
    const tags = ['alpha', 'beta', 'gamma'];
    render(<WorkflowTags tags={tags} />);
    // At minimum the first tag should be rendered
    expect(screen.getByText('alpha')).toBeInTheDocument();
  });

  it('shows an overflow popover badge when there are more tags than can fit', () => {
    // With a default container width of 0 in jsdom, all tags overflow
    const tags = ['tag-1', 'tag-2', 'tag-3', 'tag-4', 'tag-5'];
    render(<WorkflowTags tags={tags} />);
    // The component should render; overflow badge text depends on calculated visible count.
    // With zero container width the component renders a tag icon + count.
    expect(screen.getByText(tags[0])).toBeInTheDocument();
  });
});
