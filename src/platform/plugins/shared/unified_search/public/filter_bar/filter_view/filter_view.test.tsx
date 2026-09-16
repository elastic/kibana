/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import type { Filter } from '@kbn/es-query';
import { FilterView } from '.';

jest.mock('../../filter_badge', () => ({
  FilterBadge: ({ title }: { title?: string }) => <span title={title}>host: server</span>,
}));

const filter: Filter = {
  meta: { key: 'host', type: 'phrase', params: { query: 'server' } },
  query: { match_phrase: { host: 'server' } },
};

describe('FilterView tooltips', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it.each([undefined, false])('handles read-only tooltips with showTooltip=%s', (showTooltip) => {
    render(
      <FilterView
        filter={filter}
        readOnly={true}
        showTooltip={showTooltip}
        valueLabel="server"
        filterLabelStatus=""
        dataViews={[]}
      />
    );

    const badge = screen.getByText('host: server');
    fireEvent.mouseOver(badge);
    act(() => jest.runOnlyPendingTimers());

    if (showTooltip === false) {
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    } else {
      expect(screen.getByRole('tooltip')).toHaveTextContent('Filter: host: server.');
    }
    expect(badge).not.toHaveAttribute('title');
  });

  it.each([undefined, false])('handles editable tooltips with showTooltip=%s', (showTooltip) => {
    render(
      <FilterView
        filter={filter}
        readOnly={false}
        showTooltip={showTooltip}
        valueLabel="server"
        filterLabelStatus=""
        dataViews={[]}
      />
    );

    const badge = screen.getByText('host: server');
    if (showTooltip === false) {
      expect(badge).not.toHaveAttribute('title');
    } else {
      expect(badge).toHaveAttribute(
        'title',
        'Filter: host: server. Select for more filter actions.'
      );
    }
  });
});
