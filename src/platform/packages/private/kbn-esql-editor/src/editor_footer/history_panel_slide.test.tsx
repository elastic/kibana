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
import { HistoryPanelSlide } from './history_panel_slide';

const panel = () => screen.getByTestId('ESQLEditor-history-panel-slide');

const renderSlide = (isOpen: boolean) => (
  <HistoryPanelSlide isOpen={isOpen}>
    <div>Recent queries</div>
  </HistoryPanelSlide>
);

describe('HistoryPanelSlide', () => {
  it('does not render children until it has been opened', () => {
    render(renderSlide(false));

    expect(panel()).toHaveAttribute('data-expanded', 'false');
    expect(screen.queryByText('Recent queries')).not.toBeInTheDocument();
  });

  it('renders children and expands when opened', () => {
    const { rerender } = render(renderSlide(false));
    rerender(renderSlide(true));

    expect(panel()).toHaveAttribute('data-expanded', 'true');
    expect(screen.getByText('Recent queries')).toBeInTheDocument();
  });

  it('keeps children mounted but collapsed when closed again', () => {
    const { rerender } = render(renderSlide(true));
    rerender(renderSlide(false));

    expect(panel()).toHaveAttribute('data-expanded', 'false');
    expect(screen.getByText('Recent queries')).toBeInTheDocument();
  });
});
