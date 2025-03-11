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
import { EuiProvider } from '@elastic/eui';
import { LogLevelBadge } from './log_level_badge';

const renderBadge = (logLevel: string) => {
  render(
    <EuiProvider>
      <LogLevelBadge
        logLevel={logLevel}
        fallback={<span data-test-subj="logLevelBadge-unknown">{logLevel}</span>}
      />
    </EuiProvider>
  );
};

describe('LogLevelBadge', () => {
  it('renders badge with color based on provided logLevel', () => {
    renderBadge('info');
    const badge = screen.getByTestId('logLevelBadge-info');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('info');
    expect(getComputedStyle(badge).getPropertyValue('--euiBadgeBackgroundColor')).toEqual(
      '#90bdff'
    );
  });

  it('renders without a badge if logLevel is not recognized', () => {
    renderBadge('unknown_level');
    const badge = screen.getByTestId('logLevelBadge-unknown');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('unknown_level');
    expect(getComputedStyle(badge).getPropertyValue('--euiBadgeBackgroundColor')).toEqual('');
  });
});
