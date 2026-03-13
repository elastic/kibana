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

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.hubapi.com/crm/v3/objects/deals',
        { params: { limit: 10, properties: 'dealname,amount,closedate' } }
      );
    });
  });

  describe('getCrmObject action', () => {
    it('should fetch a contact by ID', async () => {
      const mockResponse = {
        data: { id: '101', properties: { firstname: 'Bob', lastname: 'Jones', email: 'bob@example.com' } },
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

  describe('searchEngagements action', () => {
    it('should search notes when a query is provided', async () => {
      const mockResponse = { data: { total: 1, results: [{ id: '301', properties: { hs_note_body: 'Follow up call' } }] } };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await HubSpotConnector.actions.searchEngagements.handler(mockContext, {
        query: 'follow up',
        engagementType: 'notes',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://api.hubapi.com/crm/v3/objects/notes/search',
        { query: 'follow up', limit: 10 }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should list emails when no query is provided', async () => {
      const mockResponse = { data: { results: [] } };
      mockClient.get.mockResolvedValue(mockResponse);

      await HubSpotConnector.actions.searchEngagements.handler(mockContext, {
        engagementType: 'emails',
        limit: 5,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.hubapi.com/crm/v3/objects/emails',
        { params: { limit: 5 } }
      );
    });
  });

  describe('listOwners action', () => {
    it('should list owners with default limit', async () => {
      const mockResponse = { data: { results: [{ id: '1', email: 'owner@example.com' }] } };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await HubSpotConnector.actions.listOwners.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://api.hubapi.com/crm/v3/owners',
        { params: { limit: 20 } }
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('searchDeals action', () => {
    it('should search deals by query', async () => {
      const mockResponse = { data: { total: 2, results: [{ id: '401', properties: { dealname: 'Enterprise Deal' } }] } };
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
});
