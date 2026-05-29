/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { searchTriggerEventLog } from './trigger_event_log_query';
import type { TriggerEventsDataStreamClient } from './trigger_events_data_stream';

describe('searchTriggerEventLog KQL translation', () => {
  const mockSearch = jest.fn().mockResolvedValue({
    hits: { hits: [], total: { value: 0 } },
  });

  const client = {
    search: mockSearch,
  } as unknown as TriggerEventsDataStreamClient;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('translates triggerId KQL using the shared workflows-events data view fields', async () => {
    await searchTriggerEventLog(client, {
      spaceId: 'default',
      kql: 'triggerId : workflows.failed',
    });

    const searchArgs = mockSearch.mock.calls[0][0];
    expect(searchArgs.query.bool.filter).toEqual([{ term: { spaceId: 'default' } }]);
    expect(searchArgs.query.bool.must).toHaveLength(1);
    expect(JSON.stringify(searchArgs.query.bool.must[0])).toContain('triggerId');
    expect(JSON.stringify(searchArgs.query.bool.must[0])).toContain('workflows.failed');
  });

  it('translates payload.* KQL using the shared workflows-events data view fields', async () => {
    await searchTriggerEventLog(client, {
      spaceId: 'default',
      kql: 'payload.workflow.status : failed',
    });

    const searchArgs = mockSearch.mock.calls[0][0];
    expect(searchArgs.query.bool.filter).toEqual([{ term: { spaceId: 'default' } }]);
    expect(searchArgs.query.bool.must).toHaveLength(1);
    expect(JSON.stringify(searchArgs.query.bool.must[0])).toContain('payload.workflow.status');
    expect(JSON.stringify(searchArgs.query.bool.must[0])).toContain('failed');
  });
});
