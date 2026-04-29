/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { render, screen } from '@testing-library/react';
import { ProfileSection } from './profile_section';
import React from 'react';

const setup = (props: React.ComponentProps<typeof ProfileSection>) => {
  render(<ProfileSection {...props} />);
};

describe('<ProfileSection />', () => {
  it('renders the title correctly', () => {
    const title = 'Test Profile Section';
    setup({ title, children: <div>Content</div> });

    expect(screen.getByText(title)).toBeVisible();
  });

  it('renders the children content', () => {
    const content = 'Some content here';
    setup({ title: 'Test Profile Section', children: <div>{content}</div> });

    expect(screen.getByText(content)).toBeVisible();
  });
});
