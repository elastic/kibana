/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { EnvironmentIndicator } from './environment_indicator';

const showTooltip = async () => {
  fireEvent.mouseOver(screen.getByText(/Development|Production/));
  return screen.findByRole('tooltip');
};

describe('EnvironmentIndicator', () => {
  it('renders with only the mode provided', async () => {
    render(<EnvironmentIndicator env={{ mode: { name: 'development' } }} />);

    expect(screen.getByText('Development')).toBeInTheDocument();
    const tooltip = await showTooltip();
    expect(tooltip).toHaveTextContent('Environment: development');
    expect(tooltip).not.toHaveTextContent('Version');
    expect(tooltip).not.toHaveTextContent('Build Date');
  });

  it('renders version, build details and labels when provided', async () => {
    render(
      <EnvironmentIndicator
        env={{
          mode: { name: 'development' },
          packageInfo: {
            version: '9.5.0',
            buildNum: 42,
            branch: 'main',
            buildFlavor: 'traditional',
            buildDate: '2026-01-02T00:00:00.000Z',
          },
          labels: { App: 'cloud-ui' },
        }}
      />
    );

    expect(screen.getByText('Development v9.5.0')).toBeInTheDocument();
    const tooltip = await showTooltip();
    expect(tooltip).toHaveTextContent('Build: 42');
    expect(tooltip).toHaveTextContent('Branch: main');
    expect(tooltip).toHaveTextContent('Build Date:');
    expect(tooltip).toHaveTextContent('App: cloud-ui');
  });

  it('skips an invalid build date instead of rendering "Invalid Date"', async () => {
    render(
      <EnvironmentIndicator
        env={{ mode: { name: 'development' }, packageInfo: { buildDate: 'not-a-date' } }}
      />
    );

    const tooltip = await showTooltip();
    expect(tooltip).not.toHaveTextContent('Build Date');
  });

  it('accepts a custom production icon', () => {
    const { container } = render(
      <EnvironmentIndicator env={{ mode: { name: 'production' } }} iconType="logoElastic" />
    );

    expect(container.querySelector('[data-euiicon-type="logoElastic"]')).toBeInTheDocument();
  });
});
