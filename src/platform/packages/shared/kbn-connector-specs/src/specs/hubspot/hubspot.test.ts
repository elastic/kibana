/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { HubSpotConnector } from './hubspot';

describe('HubSpotConnector', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    log: { debug: jest.fn(), error: jest.fn() },
    config: {},
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchCrmObjects action', () => {
    it('should call the search API when a query is provided', async () => {
      const mockResponse = {
        data: {
          total: 1,
          results: [{ id: '1', properties: { firstname: 'Alice', lastname: 'Smith' } }],
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await HubSpotConnector.actions.searchCrmObjects.handler(mockContext, {
        objectType: 'contacts',
        query: 'Alice',
        limit: 5,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://api.hubapi.com/crm/v3/objects/contacts/search',
        { query: 'Alice', limit: 5 }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should call the list API when no query is provided', async () => {
      const mockResponse = {
        data: {
          results: [{ id: '2', properties: { name: 'Acme Corp' } }],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await HubSpotConnector.actions.searchCrmObjects.handler(mockContext, {
        objectType: 'companies',
        limit: 10,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.hubapi.com/crm/v3/objects/companies',
        { params: { limit: 10 } }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should include properties in list request when provided', async () => {
      const mockResponse = { data: { results: [] } };
      mockClient.get.mockResolvedValue(mockResponse);

      await HubSpotConnector.actions.searchCrmObjects.handler(mockContext, {
        objectType: 'deals',
        properties: ['dealname', 'amount', 'closedate'],
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://api.hubapi.com/crm/v3/objects/deals', {
        params: { limit: 10, properties: 'dealname,amount,closedate' },
      });
    });

    it('should fetch associated deals when objectType is contacts and includeAssociatedDeals is true', async () => {
      mockClient.post
        .mockResolvedValueOnce({
          data: { results: [{ id: '101', properties: { firstname: 'Alice' } }] },
        })
        .mockResolvedValueOnce({
          data: { results: [{ from: { id: '101' }, to: [{ id: '501' }] }] },
        });

      const result = (await HubSpotConnector.actions.searchCrmObjects.handler(mockContext, {
        objectType: 'contacts',
        query: 'Alice',
        includeAssociatedDeals: true,
      })) as { contacts: unknown[]; associated_deals: unknown[] };

      expect(mockClient.post).toHaveBeenCalledTimes(2);
      expect(mockClient.post).toHaveBeenNthCalledWith(
        1,
        'https://api.hubapi.com/crm/v3/objects/contacts/search',
        { query: 'Alice', limit: 10 }
      );
      expect(mockClient.post).toHaveBeenNthCalledWith(
        2,
        'https://api.hubapi.com/crm/v3/associations/contacts/deals/batch/read',
        { inputs: [{ id: '101' }] }
      );
      expect(result.contacts).toHaveLength(1);
      expect(result.associated_deals).toHaveLength(1);
    });

    it('should return empty associated_deals when no contacts match and includeAssociatedDeals is true', async () => {
      mockClient.post.mockResolvedValueOnce({ data: { results: [] } });

      const result = await HubSpotConnector.actions.searchCrmObjects.handler(mockContext, {
        objectType: 'contacts',
        query: 'nobody',
        includeAssociatedDeals: true,
      });

      expect(mockClient.post).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ contacts: [], associated_deals: [] });
    });

    it('should search notes when objectType is notes and a query is provided', async () => {
      const mockResponse = {
        data: {
          total: 1,
          results: [{ id: '301', properties: { hs_note_body: 'Follow up call' } }],
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await HubSpotConnector.actions.searchCrmObjects.handler(mockContext, {
        objectType: 'notes',
        query: 'follow up',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://api.hubapi.com/crm/v3/objects/notes/search',
        { query: 'follow up', limit: 10 }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should list emails when objectType is emails and no query is provided', async () => {
      const mockResponse = { data: { results: [] } };
      mockClient.get.mockResolvedValue(mockResponse);

      await HubSpotConnector.actions.searchCrmObjects.handler(mockContext, {
        objectType: 'emails',
        limit: 5,
      });

      expect(mockClient.get).toHaveBeenCalledWith('https://api.hubapi.com/crm/v3/objects/emails', {
        params: { limit: 5 },
      });
    });
  });

  describe('getCrmObject action', () => {
    it('should fetch a contact by ID', async () => {
      const mockResponse = {
        data: {
          id: '101',
          properties: { firstname: 'Bob', lastname: 'Jones', email: 'bob@example.com' },
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await HubSpotConnector.actions.getCrmObject.handler(mockContext, {
        objectType: 'contacts',
        objectId: '101',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.hubapi.com/crm/v3/objects/contacts/101',
        { params: {} }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should include properties in the request when provided', async () => {
      const mockResponse = { data: { id: '200', properties: { dealname: 'Big Deal' } } };
      mockClient.get.mockResolvedValue(mockResponse);

      await HubSpotConnector.actions.getCrmObject.handler(mockContext, {
        objectType: 'deals',
        objectId: '200',
        properties: ['dealname', 'amount'],
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.hubapi.com/crm/v3/objects/deals/200',
        { params: { properties: 'dealname,amount' } }
      );
    });

    it('should return ticket with enriched notes when associations and notes APIs succeed', async () => {
      const ticketRecord = { id: '600', properties: { subject: 'Broken widget' } };
      mockClient.get.mockResolvedValue({ data: ticketRecord });
      mockClient.post
        .mockResolvedValueOnce({
          status: 200,
          data: { results: [{ to: [{ toObjectId: '901' }, { toObjectId: '902' }] }] },
        })
        .mockResolvedValueOnce({
          status: 200,
          data: {
            results: [
              {
                id: '901',
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-02T00:00:00Z',
                archived: false,
                properties: { hs_note_body: 'First note' },
              },
              {
                id: '902',
                createdAt: '2024-01-03T00:00:00Z',
                updatedAt: '2024-01-04T00:00:00Z',
                archived: false,
                properties: { hs_note_body: 'Second note' },
              },
            ],
          },
        });

      const result = (await HubSpotConnector.actions.getCrmObject.handler(mockContext, {
        objectType: 'tickets',
        objectId: '600',
      })) as { id: string; notes: Array<{ id: string; body: string }> };

      expect(mockClient.post).toHaveBeenNthCalledWith(
        1,
        'https://api.hubapi.com/crm/v4/associations/tickets/notes/batch/read',
        { inputs: [{ id: '600' }] },
        { validateStatus: expect.any(Function) }
      );
      expect(mockClient.post).toHaveBeenNthCalledWith(
        2,
        'https://api.hubapi.com/crm/v3/objects/notes/batch/read',
        {
          inputs: [{ id: '901' }, { id: '902' }],
          properties: ['hs_note_body'],
          propertiesWithHistory: [],
        },
        { validateStatus: expect.any(Function) }
      );
      expect(result.notes).toHaveLength(2);
      expect(result.notes[0]).toEqual({
        id: '901',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
        archived: false,
        body: 'First note',
      });
    });

    it('should return ticket with empty notes when association lookup returns no note IDs', async () => {
      mockClient.get.mockResolvedValue({ data: { id: '601', properties: {} } });
      mockClient.post.mockResolvedValueOnce({
        status: 200,
        data: { results: [{ to: [] }] },
      });

      const result = (await HubSpotConnector.actions.getCrmObject.handler(mockContext, {
        objectType: 'tickets',
        objectId: '601',
      })) as { notes: unknown[] };

      expect(mockClient.post).toHaveBeenCalledTimes(1);
      expect(result.notes).toEqual([]);
    });

    it('should return ticket with empty notes when associations API returns non-200', async () => {
      mockClient.get.mockResolvedValue({ data: { id: '602', properties: {} } });
      mockClient.post.mockResolvedValueOnce({ status: 403, data: {} });

      const result = (await HubSpotConnector.actions.getCrmObject.handler(mockContext, {
        objectType: 'tickets',
        objectId: '602',
      })) as { notes: unknown[] };

      expect(mockClient.post).toHaveBeenCalledTimes(1);
      expect(result.notes).toEqual([]);
    });

    it('should return ticket with empty notes when notes batch read returns non-200', async () => {
      mockClient.get.mockResolvedValue({ data: { id: '603', properties: {} } });
      mockClient.post
        .mockResolvedValueOnce({
          status: 200,
          data: { results: [{ to: [{ toObjectId: '910' }] }] },
        })
        .mockResolvedValueOnce({ status: 403, data: {} });

      const result = (await HubSpotConnector.actions.getCrmObject.handler(mockContext, {
        objectType: 'tickets',
        objectId: '603',
      })) as { notes: unknown[] };

      expect(result.notes).toEqual([]);
    });

    it('should return ticket with empty notes when associations API throws', async () => {
      mockClient.get.mockResolvedValue({ data: { id: '604', properties: {} } });
      mockClient.post.mockRejectedValueOnce(new Error('Network error'));

      const result = (await HubSpotConnector.actions.getCrmObject.handler(mockContext, {
        objectType: 'tickets',
        objectId: '604',
      })) as { notes: unknown[] };

      expect(result.notes).toEqual([]);
    });
  });

  describe('listOwners action', () => {
    it('should list owners with default limit', async () => {
      const mockResponse = { data: { results: [{ id: '1', email: 'owner@example.com' }] } };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await HubSpotConnector.actions.listOwners.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenCalledWith('https://api.hubapi.com/crm/v3/owners', {
        params: { limit: 20 },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should forward the after cursor for pagination', async () => {
      mockClient.get.mockResolvedValue({ data: { results: [] } });

      await HubSpotConnector.actions.listOwners.handler(mockContext, { after: 'cursor-abc' });

      expect(mockClient.get).toHaveBeenCalledWith('https://api.hubapi.com/crm/v3/owners', {
        params: { limit: 20, after: 'cursor-abc' },
      });
    });
  });

  describe('pagination (after cursor)', () => {
    it('searchCrmObjects list path should include after cursor in params', async () => {
      mockClient.get.mockResolvedValue({ data: { results: [] } });

      await HubSpotConnector.actions.searchCrmObjects.handler(mockContext, {
        objectType: 'contacts',
        after: 'page2',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.hubapi.com/crm/v3/objects/contacts',
        { params: { limit: 10, after: 'page2' } }
      );
    });

    it('searchCrmObjects search path should include after cursor in body', async () => {
      mockClient.post.mockResolvedValue({ data: { results: [] } });

      await HubSpotConnector.actions.searchCrmObjects.handler(mockContext, {
        objectType: 'deals',
        query: 'Acme',
        after: 'page3',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://api.hubapi.com/crm/v3/objects/deals/search',
        { limit: 10, query: 'Acme', after: 'page3' }
      );
    });

    it('searchDeals should include after cursor in body', async () => {
      mockClient.post.mockResolvedValue({ data: { results: [] } });

      await HubSpotConnector.actions.searchDeals.handler(mockContext, {
        query: 'Enterprise',
        after: 'page4',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://api.hubapi.com/crm/v3/objects/deals/search',
        { limit: 10, query: 'Enterprise', after: 'page4' }
      );
    });
  });

  describe('searchDeals action', () => {
    it('should search deals by query', async () => {
      const mockResponse = {
        data: { total: 2, results: [{ id: '401', properties: { dealname: 'Enterprise Deal' } }] },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await HubSpotConnector.actions.searchDeals.handler(mockContext, {
        query: 'Enterprise',
        limit: 10,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://api.hubapi.com/crm/v3/objects/deals/search',
        { limit: 10, query: 'Enterprise' }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should filter deals by pipeline and deal stage', async () => {
      const mockResponse = { data: { results: [] } };
      mockClient.post.mockResolvedValue(mockResponse);

      await HubSpotConnector.actions.searchDeals.handler(mockContext, {
        pipeline: 'default',
        dealStage: 'closedwon',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://api.hubapi.com/crm/v3/objects/deals/search',
        {
          limit: 10,
          filterGroups: [
            {
              filters: [
                { propertyName: 'pipeline', operator: 'EQ', value: 'default' },
                { propertyName: 'dealstage', operator: 'EQ', value: 'closedwon' },
              ],
            },
          ],
        }
      );
    });
  });

  describe('searchBroad action', () => {
    it('should search all four object types simultaneously', async () => {
      const mockResponse = { data: { results: [{ id: '1', properties: {} }] } };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await HubSpotConnector.actions.searchBroad.handler(mockContext, {
        query: 'Acme',
        limit: 3,
      });

      expect(mockClient.post).toHaveBeenCalledTimes(4);
      expect(mockClient.post).toHaveBeenCalledWith(
        'https://api.hubapi.com/crm/v3/objects/contacts/search',
        { query: 'Acme', limit: 3 }
      );
      expect(result).toHaveProperty('contacts');
      expect(result).toHaveProperty('companies');
      expect(result).toHaveProperty('deals');
      expect(result).toHaveProperty('tickets');
    });
  });

  describe('listPipelines action', () => {
    it('should list deal pipelines by default', async () => {
      const mockResponse = {
        data: {
          results: [
            {
              id: 'default',
              label: 'Sales Pipeline',
              stages: [
                { id: 'appointmentscheduled', label: 'Appointment Scheduled' },
                { id: 'closedwon', label: 'Closed Won' },
              ],
            },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await HubSpotConnector.actions.listPipelines.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenCalledWith('https://api.hubapi.com/crm/v3/pipelines/deals');
      expect(result).toEqual(mockResponse.data);
    });

    it('should list ticket pipelines when objectType is tickets', async () => {
      const mockResponse = { data: { results: [] } };
      mockClient.get.mockResolvedValue(mockResponse);

      await HubSpotConnector.actions.listPipelines.handler(mockContext, {
        objectType: 'tickets',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.hubapi.com/crm/v3/pipelines/tickets'
      );
    });
  });

  describe('test handler', () => {
    it('should return ok when contacts endpoint returns 200', async () => {
      mockClient.get.mockResolvedValue({ status: 200, data: { results: [] } });

      const test = HubSpotConnector.test;
      if (!test) throw new Error('Expected HubSpotConnector.test to be defined');
      const result = await test.handler(mockContext);

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.hubapi.com/crm/v3/objects/contacts',
        { params: { limit: 1 }, validateStatus: expect.any(Function) }
      );
      expect(result).toEqual({ ok: true, message: 'Successfully connected to HubSpot API' });
    });

    it('should return not ok when contacts endpoint returns 401', async () => {
      mockClient.get.mockResolvedValue({ status: 401 });

      const test = HubSpotConnector.test;
      if (!test) throw new Error('Expected HubSpotConnector.test to be defined');
      const result = await test.handler(mockContext);

      expect(result.ok).toBe(false);
    });

    it('should return not ok when contacts endpoint returns 403 (missing scope)', async () => {
      mockClient.get.mockResolvedValue({ status: 403 });

      const test = HubSpotConnector.test;
      if (!test) throw new Error('Expected HubSpotConnector.test to be defined');
      const result = await test.handler(mockContext);

      expect(result.ok).toBe(false);
      expect(result.message).toContain('403');
    });

    it('should return not ok when contacts endpoint returns 429 (rate limited)', async () => {
      mockClient.get.mockResolvedValue({ status: 429 });

      const test = HubSpotConnector.test;
      if (!test) throw new Error('Expected HubSpotConnector.test to be defined');
      const result = await test.handler(mockContext);

      expect(result.ok).toBe(false);
      expect(result.message).toContain('429');
    });

    it('should return not ok when request throws', async () => {
      mockClient.get.mockRejectedValue(new Error('ECONNREFUSED'));

      const test = HubSpotConnector.test;
      if (!test) throw new Error('Expected HubSpotConnector.test to be defined');
      const result = await test.handler(mockContext);

      expect(result.ok).toBe(false);
      expect(result.message).toBe('ECONNREFUSED');
    });
  });
});
