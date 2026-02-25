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
import moment from 'moment';
import { I18nProvider } from '@kbn/i18n-react';
import { UpdatedAtCell } from './updated_at_cell';

/** Wraps children in `I18nProvider` so `FormattedRelative` can resolve. */
const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <I18nProvider>{children}</I18nProvider>
);

// Pin "now" so relative time assertions are deterministic.
const NOW = new Date('2025-06-15T12:00:00Z');

describe('UpdatedAtCell', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders a dash when `updatedAt` is undefined', () => {
    render(
      <Wrapper>
        <UpdatedAtCell />
      </Wrapper>
    );

    expect(screen.getByTestId('content-list-table-updatedAt-unknown')).toHaveTextContent('-');
  });

  it('renders relative time for recent dates (within 7 days)', () => {
    const twoHoursAgo = new Date(NOW.getTime() - 2 * 60 * 60 * 1000);
    render(
      <Wrapper>
        <UpdatedAtCell updatedAt={twoHoursAgo} />
      </Wrapper>
    );

    const element = screen.getByTestId('content-list-table-updatedAt-value');
    expect(element).toHaveTextContent('2 hours ago');
  });

  it('renders abbreviated date for older dates (more than 7 days)', () => {
    const thirtyDaysAgo = new Date(NOW.getTime() - 30 * 24 * 60 * 60 * 1000);
    render(
      <Wrapper>
        <UpdatedAtCell updatedAt={thirtyDaysAgo} />
      </Wrapper>
    );

    const element = screen.getByTestId('content-list-table-updatedAt-value');
    const expectedText = moment(thirtyDaysAgo).format('ll');
    expect(element).toHaveTextContent(expectedText);
  });

  it('renders relative time for very recent dates', () => {
    const justNow = new Date(NOW.getTime() - 10 * 1000);
    render(
      <Wrapper>
        <UpdatedAtCell updatedAt={justNow} />
      </Wrapper>
    );

    const element = screen.getByTestId('content-list-table-updatedAt-value');
    expect(element).toHaveTextContent('10 seconds ago');
  });

  it('does not render the unknown indicator when a date is present', () => {
    const date = new Date('2025-06-14T10:30:00Z');
    render(
      <Wrapper>
        <UpdatedAtCell updatedAt={date} />
      </Wrapper>
    );

    expect(screen.queryByTestId('content-list-table-updatedAt-unknown')).not.toBeInTheDocument();
  });
});
