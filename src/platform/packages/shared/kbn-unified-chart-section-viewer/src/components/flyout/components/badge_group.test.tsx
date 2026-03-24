/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { render } from '@testing-library/react';
import { BadgeGroup } from './badge_group';

describe('BadgeGroup', () => {
  const renderItem = (item: string, index: number) => <span key={index}>{item}</span>;

  it('renders NoValueBadge when items is an empty array', () => {
    const { getByText } = render(<BadgeGroup items={[]} renderItem={renderItem} />);

    expect(getByText('No value')).toBeInTheDocument();
  });

  it('renders items via renderItem when items are present', () => {
    const { getByText, queryByText } = render(
      <BadgeGroup items={['alpha', 'beta']} renderItem={renderItem} />
    );

    expect(getByText('alpha')).toBeInTheDocument();
    expect(getByText('beta')).toBeInTheDocument();
    expect(queryByText('No value')).not.toBeInTheDocument();
  });

  it('renders NoValueBadge for items matching isNoValue guard', () => {
    const { getByText, queryByText } = render(
      <BadgeGroup<string | null>
        items={[null, 'visible']}
        isNoValue={(item) => item == null}
        renderItem={(item, index) => <span key={index}>{item}</span>}
      />
    );

    expect(getByText('No value')).toBeInTheDocument();
    expect(getByText('visible')).toBeInTheDocument();
    expect(queryByText('null')).not.toBeInTheDocument();
  });

  it('does not render NoValueBadge when isNoValue is not provided', () => {
    const { getByText, queryByText } = render(
      <BadgeGroup items={['a', 'b']} renderItem={renderItem} />
    );

    expect(getByText('a')).toBeInTheDocument();
    expect(getByText('b')).toBeInTheDocument();
    expect(queryByText('No value')).not.toBeInTheDocument();
  });
});
