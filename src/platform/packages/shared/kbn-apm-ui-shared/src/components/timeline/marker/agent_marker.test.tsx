/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithTheme } from '../../../utils/test_helpers';
import { AgentMarker } from './agent_marker';
import type { AgentMark } from '../../../types/mark';

describe('AgentMarker', () => {
  const createAgentMark = (overrides: Partial<AgentMark> = {}): AgentMark => ({
    type: 'agentMark',
    id: 'test-agent-mark',
    offset: 1500000, // 1.5 seconds in microseconds
    verticalLine: true,
    ...overrides,
  });

  it('should render the Legend component', () => {
    const mark = createAgentMark();
    const { container } = renderWithTheme(<AgentMarker mark={mark} />);

    // Legend renders an indicator (circle by default)
    const indicator = container.querySelector('span');
    expect(indicator).toBeInTheDocument();
  });

  it('should show tooltip with mark id on hover', async () => {
    const mark = createAgentMark({ id: 'my-custom-mark' });
    const { container } = renderWithTheme(<AgentMarker mark={mark} />);

    const indicator = container.querySelector('span');
    fireEvent.mouseOver(indicator!);

    await waitFor(() => {
      expect(screen.getByText('my-custom-mark')).toBeInTheDocument();
    });
  });

  it('should show formatted duration in tooltip on hover', async () => {
    const mark = createAgentMark({ offset: 2500000 }); // 2.5 seconds in microseconds
    const { container } = renderWithTheme(<AgentMarker mark={mark} />);

    const indicator = container.querySelector('span');
    fireEvent.mouseOver(indicator!);

    await waitFor(() => {
      // asDuration formats microseconds to human readable format
      expect(screen.getByText('2,500 ms')).toBeInTheDocument();
    });
  });

  it('should render with clickable Legend', () => {
    const mark = createAgentMark();
    const { container } = renderWithTheme(<AgentMarker mark={mark} />);

    // The Legend component should have clickable prop set to true
    const legendContainer = container.querySelector('div');
    expect(legendContainer).toHaveStyle('cursor: pointer');
  });

  describe('tooltip content', () => {
    it('should display the mark id in the name container', async () => {
      const mark = createAgentMark({ id: 'agent-timing-mark' });
      const { container } = renderWithTheme(<AgentMarker mark={mark} />);

      const indicator = container.querySelector('span');
      fireEvent.mouseOver(indicator!);

      await waitFor(() => {
        expect(screen.getByText('agent-timing-mark')).toBeInTheDocument();
      });
    });

    it('should display zero duration correctly', async () => {
      const mark = createAgentMark({ offset: 0 });
      const { container } = renderWithTheme(<AgentMarker mark={mark} />);

      const indicator = container.querySelector('span');
      fireEvent.mouseOver(indicator!);

      await waitFor(() => {
        expect(screen.getByText('0 μs')).toBeInTheDocument();
      });
    });

    it('should display microseconds for small offsets', async () => {
      const mark = createAgentMark({ offset: 500 }); // 500 microseconds
      const { container } = renderWithTheme(<AgentMarker mark={mark} />);

      const indicator = container.querySelector('span');
      fireEvent.mouseOver(indicator!);

      await waitFor(() => {
        expect(screen.getByText('500 μs')).toBeInTheDocument();
      });
    });
  });
});
