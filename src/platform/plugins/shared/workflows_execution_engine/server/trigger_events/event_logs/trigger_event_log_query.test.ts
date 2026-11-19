/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MAX_PAGE_SIZE, TRACK_TOTAL_HITS_CAP } from './constants';
import { searchTriggerEventLog } from './trigger_event_log_query';
import type { TriggerEventsDataStreamClient } from './trigger_events_data_stream';

describe('searchTriggerEventLog', () => {
  const mockSearch = jest.fn().mockResolvedValue({
    hits: { hits: [], total: { value: 0 } },
  });

  const client = {
    search: mockSearch,
  } as unknown as TriggerEventsDataStreamClient;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('KQL translation', () => {
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

    it('uses case-insensitive term queries for camelCase trigger ids', async () => {
      await searchTriggerEventLog(client, {
        spaceId: 'default',
        kql: 'triggerId: "cases.caseCreated"',
      });

      const kqlClause = mockSearch.mock.calls[0][0].query.bool.must[0];
      expect(kqlClause).toEqual({
        bool: {
          should: [
            {
              term: {
                triggerId: {
                  value: 'cases.caseCreated',
                  case_insensitive: true,
                },
              },
            },
          ],
          minimum_should_match: 1,
        },
      });
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

    it('ignores whitespace-only KQL', async () => {
      await searchTriggerEventLog(client, {
        spaceId: 'default',
        kql: '   ',
      });

      const searchArgs = mockSearch.mock.calls[0][0];
      expect(searchArgs.query.bool.filter).toEqual([{ term: { spaceId: 'default' } }]);
      expect(searchArgs.query.bool.must).toBeUndefined();
    });

    it('applies the shared track_total_hits cap for ES cost control', async () => {
      await searchTriggerEventLog(client, { spaceId: 'default' });

      expect(mockSearch.mock.calls[0][0].track_total_hits).toBe(TRACK_TOTAL_HITS_CAP);
    });
  });

  describe('pagination', () => {
    it('uses default page 1 and size 10 when omitted', async () => {
      const result = await searchTriggerEventLog(client, { spaceId: 'default' });

      expect(mockSearch.mock.calls[0][0]).toMatchObject({ from: 0, size: 10 });
      expect(result).toMatchObject({ page: 1, size: 10, hits: [], total: 0 });
    });

    it('computes the ES from offset for later pages', async () => {
      mockSearch.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: 'evt-26',
              _source: {
                '@timestamp': '2025-01-02T00:00:00.000Z',
                eventId: 'evt-26',
                triggerId: 'workflows.failed',
                spaceId: 'default',
                subscriptions: [],
                payload: {},
              },
            },
          ],
          total: { value: 100 },
        },
      });

      const result = await searchTriggerEventLog(client, {
        spaceId: 'default',
        page: 2,
        size: 25,
      });

      expect(mockSearch.mock.calls[0][0]).toMatchObject({
        from: 25,
        size: 25,
        sort: [{ '@timestamp': { order: 'desc' } }],
      });
      expect(result).toMatchObject({
        page: 2,
        size: 25,
        total: 100,
        hits: [{ id: 'evt-26', source: expect.objectContaining({ eventId: 'evt-26' }) }],
      });
    });

    it('clamps page below 1 to the first page', async () => {
      const result = await searchTriggerEventLog(client, {
        spaceId: 'default',
        page: 0,
        size: 20,
      });

      expect(mockSearch.mock.calls[0][0]).toMatchObject({ from: 0, size: 20 });
      expect(result.page).toBe(1);
    });

    it('clamps size above MAX_PAGE_SIZE', async () => {
      const result = await searchTriggerEventLog(client, {
        spaceId: 'default',
        page: 3,
        size: 500,
      });

      expect(mockSearch.mock.calls[0][0]).toMatchObject({
        from: (3 - 1) * MAX_PAGE_SIZE,
        size: MAX_PAGE_SIZE,
      });
      expect(result.size).toBe(MAX_PAGE_SIZE);
    });

    it('clamps size below 1 to 1', async () => {
      const result = await searchTriggerEventLog(client, {
        spaceId: 'default',
        page: 4,
        size: 0,
      });

      expect(mockSearch.mock.calls[0][0]).toMatchObject({ from: 3, size: 1 });
      expect(result.size).toBe(1);
    });
  });

  describe('filters and response mapping', () => {
    it('adds a @timestamp range filter when from/to are provided', async () => {
      await searchTriggerEventLog(client, {
        spaceId: 'acme',
        from: '2025-01-01T00:00:00.000Z',
        to: '2025-01-31T23:59:59.999Z',
      });

      expect(mockSearch.mock.calls[0][0].query.bool.filter).toEqual([
        { term: { spaceId: 'acme' } },
        {
          range: {
            '@timestamp': {
              gte: '2025-01-01T00:00:00.000Z',
              lte: '2025-01-31T23:59:59.999Z',
            },
          },
        },
      ]);
    });

    it('returns empty hits without searching when the data stream client is unavailable', async () => {
      const result = await searchTriggerEventLog(undefined, {
        spaceId: 'default',
        page: 2,
        size: 25,
      });

      expect(mockSearch).not.toHaveBeenCalled();
      expect(result).toEqual({ hits: [], total: 0, page: 2, size: 25 });
    });

    it('maps ES hits and supports numeric total responses', async () => {
      mockSearch.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: 'doc-1',
              _source: {
                '@timestamp': '2025-01-01T12:00:00.000Z',
                eventId: 'e1',
                triggerId: 'cases.created',
                spaceId: 'default',
                subscriptions: ['wf-1', 42, 'wf-2'],
                sourceExecutionId: 'exec-1',
                payload: { status: 'open' },
              },
            },
            {
              _id: 'doc-2',
              _source: null,
            },
          ],
          total: 2,
        },
      });

      const result = await searchTriggerEventLog(client, { spaceId: 'default' });

      expect(result.total).toBe(2);
      expect(result.hits[0]).toEqual({
        id: 'doc-1',
        source: {
          '@timestamp': '2025-01-01T12:00:00.000Z',
          eventId: 'e1',
          triggerId: 'cases.created',
          spaceId: 'default',
          subscriptions: ['wf-1', 'wf-2'],
          sourceExecutionId: 'exec-1',
          payload: { status: 'open' },
        },
      });
      expect(result.hits[1]).toEqual({
        id: 'doc-2',
        source: {
          '@timestamp': '',
          eventId: '',
          triggerId: '',
          spaceId: '',
          subscriptions: [],
          payload: {},
        },
      });
    });

    it('normalizes invalid payload shapes to an empty object', async () => {
      mockSearch.mockResolvedValueOnce({
        hits: {
          hits: [
            {
              _id: 'doc-bad-payload',
              _source: {
                '@timestamp': '2025-01-01T12:00:00.000Z',
                eventId: 'e2',
                triggerId: 'workflows.failed',
                spaceId: 'default',
                subscriptions: [],
                payload: null,
              },
            },
          ],
          total: { value: 1 },
        },
      });

      const result = await searchTriggerEventLog(client, { spaceId: 'default' });

      expect(result.hits[0]?.source.payload).toEqual({});
    });
  });
});
