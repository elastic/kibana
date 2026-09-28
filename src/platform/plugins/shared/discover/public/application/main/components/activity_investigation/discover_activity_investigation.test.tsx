/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License, v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiProvider } from '@elastic/eui';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import type { ActivityInvestigationResult } from './fetch_activity_investigation';
import { useActivityInvestigation } from './use_activity_investigation';
import { DiscoverActivityInvestigation } from './discover_activity_investigation';
import {
  getActivityInvestigationQuestion,
  getActivityInvestigationSubject,
} from './activity_investigation_chat';
import { ActivityInvestigationQuestion } from './activity_investigation_question';

jest.mock('./use_activity_investigation', () => ({
  useActivityInvestigation: jest.fn(),
}));
jest.mock('./use_activity_investigation_chat', () => ({
  useActivityInvestigationChat: () => ({
    canOpenChat: true,
    chatOpen: false,
    isOpening: false,
    clearError: jest.fn(),
    investigate: jest.fn(),
  }),
}));

describe('activity investigation messages', () => {
  afterEach(() => jest.clearAllMocks());

  const totalResult: ActivityInvestigationResult = {
    id: 'total',
    context: {
      query: { esql: 'FROM logs' },
      indexPattern: 'logs',
      timeFieldName: '@timestamp',
      timeRange: { from: '2026-09-24T00:00:00Z', to: '2026-09-25T00:00:00Z' },
      filters: [],
      esqlVariables: [],
    },
    request: { query: 'FROM logs', timeZone: 'UTC' },
    asOfMs: Date.parse('2026-09-25T00:00:00Z'),
    metric: 'query_result_count',
    buckets: [],
    increase: {
      kind: 'historical_interval',
      pvalue: 0.01,
      startTimeMs: Date.parse('2026-09-24T12:00:00Z'),
      endTimeMs: Date.parse('2026-09-24T14:00:00Z'),
      intervalMs: 3_600_000,
      bucketCount: 2,
      baseline: 10,
      observedMean: 20,
      observedTotal: 40,
      excess: 20,
      percentageChange: 100,
    },
  };

  it('shows the investigation when only the total has an increase', () => {
    jest.mocked(useActivityInvestigation).mockReturnValue({
      analysis: { results: [totalResult], groupAnalysisIncomplete: false },
    });
    const { getByRole } = renderWithI18n(
      <EuiProvider>
        <DiscoverActivityInvestigation />
      </EuiProvider>
    );
    expect(getByRole('button', { name: 'Investigate' })).toBeInTheDocument();
  });

  it('keeps the selector button short without the multiplier, count or interval', () => {
    jest.mocked(useActivityInvestigation).mockReturnValue({
      analysis: {
        results: [
          totalResult,
          { ...totalResult, id: 'service', actor: { field: 'service.name', value: 'checkout' } },
        ],
        groupAnalysisIncomplete: false,
      },
    });
    const { getByRole } = renderWithI18n(
      <EuiProvider>
        <DiscoverActivityInvestigation />
      </EuiProvider>
    );
    const selector = getByRole('button', { name: '2 activity increases found' });
    expect(selector).toHaveTextContent(/^The query results$/);
    expect(selector).not.toHaveTextContent(/times as much|2026|increases/);
    expect(
      selector.closest('[data-test-subj="discoverActivityInvestigationQuestion"]')
    ).not.toBeNull();
  });

  it.each([
    totalResult,
    { ...totalResult, id: 'service', actor: { field: 'service.name', value: 'checkout' } },
    { ...totalResult, id: 'sum', metric: 'field_sum' as const, metricField: 'bytes' },
  ])('keeps the inline question identical to the chat for $id', (result) => {
    for (const percentageChange of [100, null]) {
      const selected = { ...result, increase: { ...result.increase, percentageChange } };
      const subject = selected.metricField ?? getActivityInvestigationSubject(selected);
      const { container, unmount } = renderWithI18n(
        <ActivityInvestigationQuestion result={selected} subject={<span>{subject}</span>} />
      );
      expect(container.textContent).toBe(
        getActivityInvestigationQuestion(selected.increase, selected.actor, selected.metricField)
      );
      unmount();
    }
  });

  it('uses short subjects for total, categorical and sum options', () => {
    expect(getActivityInvestigationSubject(totalResult)).toBe('The query results');
    expect(
      getActivityInvestigationSubject({
        ...totalResult,
        actor: { field: 'service.name', value: 'checkout' },
      })
    ).toBe('service.name = "checkout"');
    expect(
      getActivityInvestigationSubject({
        ...totalResult,
        metric: 'field_sum',
        metricField: 'bytes',
      })
    ).toBe('Sum of bytes');
  });

  it.each([
    { ...totalResult, id: 'service', actor: { field: 'service.name', value: 'checkout' } },
    { ...totalResult, id: 'amount', metric: 'field_sum' as const, metricField: 'amount' },
  ])('shows the investigation for the field result $id', (fieldResult) => {
    jest.mocked(useActivityInvestigation).mockReturnValue({
      analysis: { results: [fieldResult], groupAnalysisIncomplete: false },
    });
    const { getByRole } = renderWithI18n(
      <EuiProvider>
        <DiscoverActivityInvestigation />
      </EuiProvider>
    );
    expect(getByRole('button', { name: 'Investigate' })).toBeInTheDocument();
  });

  it('does not show a generic partial-field warning without findings', () => {
    jest.mocked(useActivityInvestigation).mockReturnValue({
      analysis: { results: [], groupAnalysisIncomplete: true },
    });
    const { container, queryByText } = renderWithI18n(
      <EuiProvider>
        <DiscoverActivityInvestigation />
      </EuiProvider>
    );
    expect(container.querySelector('[role="status"]')).toBeNull();
    expect(queryByText(/Some fields could not be fully analyzed/)).not.toBeInTheDocument();
  });

  it('still displays an actual analysis failure', () => {
    jest.mocked(useActivityInvestigation).mockReturnValue({ error: 'failed' });
    const { getByText } = renderWithI18n(
      <EuiProvider>
        <DiscoverActivityInvestigation />
      </EuiProvider>
    );
    expect(getByText('Activity analysis failed. Refresh the query to try again.')).toBeInTheDocument();
  });
});
