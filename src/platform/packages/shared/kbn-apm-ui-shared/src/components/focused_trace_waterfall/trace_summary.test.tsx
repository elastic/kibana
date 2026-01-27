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
import { TraceSummary } from './trace_summary';

describe('TraceSummary', () => {
  describe('when rendering with singular values', () => {
    it('should display singular labels for services, trace events, and errors', () => {
      const summary = {
        services: 1,
        traceEvents: 1,
        errors: 1,
      };

      render(<TraceSummary summary={summary} />);

      expect(screen.getByText('1 service')).toBeInTheDocument();
      expect(screen.getByText('1 trace event')).toBeInTheDocument();
      expect(screen.getByText('1 error')).toBeInTheDocument();
    });
  });

  describe('when rendering with plural values', () => {
    it('should display plural labels for services, trace events, and errors', () => {
      const summary = {
        services: 5,
        traceEvents: 10,
        errors: 3,
      };

      render(<TraceSummary summary={summary} />);

      expect(screen.getByText('5 services')).toBeInTheDocument();
      expect(screen.getByText('10 trace events')).toBeInTheDocument();
      expect(screen.getByText('3 errors')).toBeInTheDocument();
    });
  });

  describe('when rendering with zero values', () => {
    it('should display plural labels for zero counts', () => {
      const summary = {
        services: 0,
        traceEvents: 0,
        errors: 0,
      };

      render(<TraceSummary summary={summary} />);

      expect(screen.getByText('0 services')).toBeInTheDocument();
      expect(screen.getByText('0 trace events')).toBeInTheDocument();
      expect(screen.getByText('0 errors')).toBeInTheDocument();
    });
  });

  describe('error icon', () => {
    it('should render the error icon', () => {
      const summary = {
        services: 1,
        traceEvents: 1,
        errors: 1,
      };

      const { container } = render(<TraceSummary summary={summary} />);

      const errorIcon = container.querySelector('[data-euiicon-type="errorFilled"]');
      expect(errorIcon).toBeInTheDocument();
    });
  });
});
