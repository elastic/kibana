/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import type { ValueSource } from './value_source_toggle';
import { ValueSourceToggle } from './value_source_toggle';
import { TestProvider } from '../../../shared/mocks/test_providers';

const renderToggle = (
  source: ValueSource,
  props: Partial<React.ComponentProps<typeof ValueSourceToggle>> = {}
) => {
  const onChange = jest.fn();
  render(
    <ValueSourceToggle
      source={source}
      fieldLabel="Timeout"
      onChange={onChange}
      data-test-subj="toggle"
      {...props}
    />,
    { wrapper: TestProvider }
  );
  return { onChange };
};

describe('ValueSourceToggle', () => {
  it('shows Fixed and Data, with the current source selected', () => {
    renderToggle('fixed');
    expect(screen.getByRole('button', { name: 'Fixed' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Data' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('selects Data when the source is data', () => {
    renderToggle('data');
    expect(screen.getByRole('button', { name: 'Data' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Fixed' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('reports the side that was picked', () => {
    const { onChange } = renderToggle('fixed');
    fireEvent.click(screen.getByRole('button', { name: 'Data' }));
    expect(onChange).toHaveBeenCalledWith('data');
  });

  it('reports fixed when going back from data', () => {
    const { onChange } = renderToggle('data');
    fireEvent.click(screen.getByRole('button', { name: 'Fixed' }));
    expect(onChange).toHaveBeenCalledWith('fixed');
  });

  it('uses the given words when Fixed and Data do not describe the control', () => {
    renderToggle('fixed', { labels: { fixed: 'Entries', data: 'From data' } });
    expect(screen.getByRole('button', { name: 'Entries' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'From data' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Fixed' })).not.toBeInTheDocument();
  });

  it('names the group after the field for screen readers', () => {
    renderToggle('fixed');
    expect(screen.getByRole('group', { name: 'Value source for Timeout' })).toBeInTheDocument();
  });

  it('derives the test subjects of both sides from the group one', () => {
    renderToggle('fixed');
    expect(screen.getByTestId('toggle')).toBeInTheDocument();
    expect(screen.getByTestId('toggle-fixed')).toBeInTheDocument();
    expect(screen.getByTestId('toggle-data')).toBeInTheDocument();
  });
});
