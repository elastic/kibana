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
  });
});
