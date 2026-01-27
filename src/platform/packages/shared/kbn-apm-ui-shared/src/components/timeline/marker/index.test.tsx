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
import { Marker } from '.';
import type { AgentMark, ErrorMark } from '../../../types/mark';

jest.mock('./error_marker', () => ({
  ErrorMarker: ({ mark }: { mark: ErrorMark }) => (
    <div data-test-subj="ErrorMarker">ErrorMarker: {mark.id}</div>
  ),
}));

jest.mock('./agent_marker', () => ({
  AgentMarker: ({ mark }: { mark: AgentMark }) => (
    <div data-test-subj="AgentMarker">AgentMarker: {mark.id}</div>
  ),
}));

describe('Marker', () => {
  const baseErrorMark: ErrorMark = {
    type: 'errorMark',
    id: 'error-1',
    offset: 100,
    verticalLine: true,
    error: {} as ErrorMark['error'],
    serviceColor: '#ff0000',
  };

  const agentMark: AgentMark = {
    type: 'agentMark',
    id: 'agent-1',
    offset: 200,
    verticalLine: true,
  };

  describe('positioning', () => {
    it('should position the marker container based on x prop', () => {
      const { container } = render(<Marker mark={agentMark} x={100} />);

      const markerContainer = container.firstChild as HTMLElement;
      // legendWidth is 11, so left should be x - 11/2 = 100 - 5.5 = 94.5
      expect(markerContainer.style.left).toBe('94.5px');
    });
  });

  describe('when mark is an errorMark with onClick', () => {
    it('should render ErrorMarker component', () => {
      const errorMarkWithOnClick: ErrorMark = {
        ...baseErrorMark,
        onClick: jest.fn(),
      };

      render(<Marker mark={errorMarkWithOnClick} x={100} />);

      expect(screen.getByTestId('ErrorMarker')).toBeInTheDocument();
      expect(screen.queryByTestId('AgentMarker')).not.toBeInTheDocument();
    });
  });

  describe('when mark is an agentMark', () => {
    it('should render AgentMarker component', () => {
      render(<Marker mark={agentMark} x={100} />);

      expect(screen.getByTestId('AgentMarker')).toBeInTheDocument();
      expect(screen.queryByTestId('ErrorMarker')).not.toBeInTheDocument();
      expect(screen.queryByTestId('ErrorMarkerWithLink')).not.toBeInTheDocument();
    });
  });
});
