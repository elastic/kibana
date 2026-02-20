/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { SalesforceConnector } from './salesforce';

describe('SalesforceConnector', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const baseUrl = 'https://myorg.my.salesforce.com';
  const mockContext = {
    client: mockClient,
    config: { instanceUrl: baseUrl },
    secrets: {},
    log: { debug: jest.fn() },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('search action', () => {
    it('should run SOQL query', async () => {
      const mockResponse = {
        data: {
          totalSize: 1,
          done: true,
          records: [{ Id: '001xx000001', Name: 'Acme' }],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await SalesforceConnector.actions.search.handler(mockContext, {
        soql: 'SELECT Id, Name FROM Account LIMIT 10',
      });

      expect(mockClient.get).toHaveBeenCalledWith(`${baseUrl}/services/data/v59.0/query`, {
        params: { q: 'SELECT Id, Name FROM Account LIMIT 10' },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should use nextRecordsUrl when provided', async () => {
      const nextUrl = '/services/data/v59.0/query/01gxx0000001';
      const mockResponse = {
        data: {
          totalSize: 2000,
          done: false,
          nextRecordsUrl: '/services/data/v59.0/query/01gxx0000002',
          records: [],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      await SalesforceConnector.actions.search.handler(mockContext, {
        soql: '',
        nextRecordsUrl: nextUrl,
      });

      expect(mockClient.get).toHaveBeenCalledWith(nextUrl, {});
    });
  });

  describe('get_record action', () => {
    it('should get record by sobject name and id', async () => {
      const mockResponse = {
        data: {
          Id: '001xx000001',
          Name: 'Acme Corp',
          Type: 'Customer - Direct',
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await SalesforceConnector.actions.get_record.handler(mockContext, {
        sobjectName: 'Account',
        recordId: '001xx000001',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${baseUrl}/services/data/v59.0/sobjects/Account/001xx000001`,
        {}
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('list_records action', () => {
    it('should list records for sobject with default limit', async () => {
      const mockResponse = {
        data: {
          totalSize: 2,
          done: true,
          records: [{ Id: '001xx000001' }, { Id: '001xx000002' }],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await SalesforceConnector.actions.list_records.handler(mockContext, {
        sobjectName: 'Account',
      });

      expect(mockClient.get).toHaveBeenCalledWith(`${baseUrl}/services/data/v59.0/query`, {
        params: { q: 'SELECT Id FROM Account LIMIT 200' },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should list records with custom limit', async () => {
      const mockResponse = { data: { totalSize: 0, done: true, records: [] } };
      mockClient.get.mockResolvedValue(mockResponse);

      await SalesforceConnector.actions.list_records.handler(mockContext, {
        sobjectName: 'Contact',
        limit: 50,
      });

      expect(mockClient.get).toHaveBeenCalledWith(`${baseUrl}/services/data/v59.0/query`, {
        params: { q: 'SELECT Id FROM Contact LIMIT 50' },
      });
    });

    it('should use nextRecordsUrl when provided', async () => {
      const nextUrl = '/services/data/v59.0/query/01gxx0000001';
      mockClient.get.mockResolvedValue({ data: { records: [], done: true } });

      await SalesforceConnector.actions.list_records.handler(mockContext, {
        sobjectName: 'Account',
        nextRecordsUrl: nextUrl,
      });

      expect(mockClient.get).toHaveBeenCalledWith(nextUrl, {});
    });
  });

  describe('test handler', () => {
    it('should return success when API is accessible', async () => {
      mockClient.get.mockResolvedValue({
        data: { totalSize: 1, done: true, records: [{ Id: '005xx000001' }] },
      });

      if (!SalesforceConnector.test) {
        throw new Error('Test handler not defined');
      }
      const result = await SalesforceConnector.test.handler(mockContext);

      expect(mockClient.get).toHaveBeenCalledWith(`${baseUrl}/services/data/v59.0/query`, {
        params: { q: 'SELECT Id FROM User LIMIT 1' },
      });
      expect(result).toEqual({
        ok: true,
        message: 'Successfully connected to Salesforce',
      });
    });

    it('should return failure when API is not accessible', async () => {
      mockClient.get.mockRejectedValue(new Error('Invalid token'));

      if (!SalesforceConnector.test) {
        throw new Error('Test handler not defined');
      }
      const result = await SalesforceConnector.test.handler(mockContext);

      expect(result.ok).toBe(false);
      expect(result.message).toBe('Invalid token');
    });
  });
});
