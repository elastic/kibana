/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { coreMock } from '@kbn/core/public/mocks';
import type { HousekeepingFindingGroup } from '../../common';
import { ContentListCoreContext } from '../metadata';
import { FindingsTable } from './findings_table';

const broken: HousekeepingFindingGroup = {
  id: 'broken_reference:ingest_pipeline',
  kind: 'broken_reference',
  title: 'Missing ingest pipeline',
  findings: [
    {
      id: 'logs',
      resource: { type: 'index_template', id: 'logs-app' },
      related: [{ type: 'ingest_pipeline', id: 'gone' }],
    },
  ],
};
const unused: HousekeepingFindingGroup = {
  id: 'unused:ingest_pipeline',
  kind: 'unused',
  title: 'Unused ingest pipeline',
  findings: [
    { id: 'forgotten', resource: { type: 'ingest_pipeline', id: 'forgotten' }, related: [] },
  ],
};
const deprecated: HousekeepingFindingGroup = {
  id: 'deprecation:index',
  kind: 'deprecation',
  title: 'Index needs reindexing',
  findings: [
    {
      id: 'old',
      resource: { type: 'index', id: 'old-index' },
      related: [],
      severity: 'critical',
    },
  ],
};

const core = coreMock.createStart();
core.uiSettings.get.mockImplementation((key: string) =>
  key === 'savedObjects:listingLimit' ? 1000 : 20
);

const table = (
  groups: HousekeepingFindingGroup[],
  kinds?: Parameters<typeof FindingsTable>[0]['kinds']
) => (
  <ContentListCoreContext.Provider value={core}>
    <FindingsTable groups={groups} kinds={kinds} />
  </ContentListCoreContext.Provider>
);

describe('FindingsTable', () => {
  it('opens on the most urgent kind with findings', async () => {
    render(table([broken, unused]));

    expect(await screen.findByText('logs-app')).toBeInTheDocument();
    expect(screen.queryByText('forgotten')).not.toBeInTheDocument();
  });

  it('drops the kind filter when a new run leaves it without findings', async () => {
    const { rerender } = render(table([broken, unused]));
    await screen.findByText('logs-app');

    rerender(table([unused]));

    expect(await screen.findByText('forgotten')).toBeInTheDocument();
  });

  it('keeps the kind filter while it still has findings', async () => {
    const { rerender } = render(table([broken, unused]));
    await screen.findByText('logs-app');

    rerender(table([{ ...broken, findings: [...broken.findings] }, unused]));

    await waitFor(() => expect(screen.getByText('logs-app')).toBeInTheDocument());
    expect(screen.queryByText('forgotten')).not.toBeInTheDocument();
  });

  it('shows the counts of the kinds that the run can report only', async () => {
    render(table([broken, unused], ['broken_reference', 'unused']));
    await screen.findByText('logs-app');

    expect(screen.getByTestId('housekeepingSummary-broken_reference')).toBeInTheDocument();
    expect(screen.queryByTestId('housekeepingSummary-deprecation')).not.toBeInTheDocument();
    expect(screen.queryByTestId('housekeepingSummary-risk')).not.toBeInTheDocument();
  });

  it('shows the severity column when a shown finding has a severity', async () => {
    render(table([broken, deprecated]));
    await screen.findByText('logs-app');
    expect(screen.queryByRole('columnheader', { name: /Severity/ })).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('housekeepingSummary-deprecation'));

    expect(await screen.findByText('old-index')).toBeInTheDocument();
    expect(screen.getByText('logs-app')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Severity/ })).toBeInTheDocument();
  });
});
