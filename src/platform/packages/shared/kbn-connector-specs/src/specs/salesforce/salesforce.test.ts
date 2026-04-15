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
    config: {},
    secrets: { tokenUrl: `${baseUrl}/services/oauth2/token` },
    log: { debug: jest.fn() },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should define every action (except test) as a tool for agent exposure', () => {
    for (const actionName of Object.keys(SalesforceConnector.actions)) {
      if (actionName !== 'test') {
        expect(SalesforceConnector.actions[actionName].isTool).toBe(true);
      }
    }
  });

  describe('auth', () => {
    it('supports oauth_client_credentials auth', () => {
      const types = (SalesforceConnector.auth?.types as Array<string | { type: string }>).map((t) =>
        typeof t === 'string' ? t : t.type
      );
      expect(types).toContain('oauth_client_credentials');
    });

    it('supports oauth_authorization_code with correct Salesforce defaults and placeholders', () => {
      const oauthType = (
        SalesforceConnector.auth?.types as Array<
          | string
          | {
              type: string;
              defaults?: Record<string, unknown>;
              overrides?: Record<string, unknown>;
            }
        >
      ).find((t) => typeof t === 'object' && t.type === 'oauth_authorization_code');
      expect(oauthType).toBeDefined();
      expect(oauthType).toMatchObject({
        type: 'oauth_authorization_code',
        defaults: {
          scope: 'api refresh_token',
        },
        overrides: {
          meta: {
            authorizationUrl: {
              placeholder: 'https://login.salesforce.com/services/oauth2/authorize',
            },
            tokenUrl: {
              placeholder: 'https://login.salesforce.com/services/oauth2/token',
            },
            scope: { hidden: true },
          },
        },
      });
    });
  });

  describe('query action', () => {
    it('should run SOQL query', async () => {
      const mockResponse = {
        data: {
          totalSize: 1,
          done: true,
          records: [{ Id: '001xx000001', Name: 'Acme' }],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await SalesforceConnector.actions.query.handler(mockContext, {
        soql: 'SELECT Id, Name FROM Account LIMIT 10',
      });

      expect(mockClient.get).toHaveBeenCalledWith(`${baseUrl}/services/data/v66.0/query`, {
        params: { q: 'SELECT Id, Name FROM Account LIMIT 10' },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should use nextRecordsUrl when provided', async () => {
      const nextUrl = '/services/data/v66.0/query/01gxx0000001';
      const mockResponse = {
        data: {
          totalSize: 2000,
          done: false,
          nextRecordsUrl: '/services/data/v66.0/query/01gxx0000002',
          records: [],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      await SalesforceConnector.actions.query.handler(mockContext, {
        soql: '',
        nextRecordsUrl: nextUrl,
      });

      expect(mockClient.get).toHaveBeenCalledWith(`${baseUrl}${nextUrl}`, {});
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
        `${baseUrl}/services/data/v66.0/sobjects/Account/001xx000001`,
        {}
      );
      expect(result).toEqual(mockResponse.data);
    });
  });

  describe('search action (SOSL)', () => {
    it('should run SOSL search with search term and returning objects', async () => {
      const mockResponse = {
        data: {
          searchRecords: [
            { attributes: { type: 'Account' }, Id: '001xx000001', Name: 'Acme Corp' },
            { attributes: { type: 'Contact' }, Id: '003xx000001', Name: 'Jane Doe' },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await SalesforceConnector.actions.search.handler(mockContext, {
        searchTerm: 'Acme',
        returning: 'Account,Contact,Opportunity',
      });

      expect(mockClient.get).toHaveBeenCalledWith(`${baseUrl}/services/data/v66.0/search`, {
        params: { q: 'FIND {Acme} RETURNING Account,Contact,Opportunity' },
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('should use nextRecordsUrl when provided', async () => {
      const nextUrl = '/services/data/v66.0/search/01gxx0000001';
      mockClient.get.mockResolvedValue({ data: { searchRecords: [] } });

      await SalesforceConnector.actions.search.handler(mockContext, {
        searchTerm: 'test',
        returning: 'Account',
        nextRecordsUrl: nextUrl,
      });

      expect(mockClient.get).toHaveBeenCalledWith(`${baseUrl}${nextUrl}`, {});
    });
  });

  describe('describe action', () => {
    it('should get sobject describe metadata', async () => {
      const mockResponse = {
        data: {
          name: 'Account',
          fields: [
            { name: 'Id', type: 'id' },
            { name: 'Name', type: 'string' },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = await SalesforceConnector.actions.describe.handler(mockContext, {
        sobjectName: 'Account',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${baseUrl}/services/data/v66.0/sobjects/Account/describe`,
        {}
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should throw on invalid sobject name', async () => {
      await expect(
        SalesforceConnector.actions.describe.handler(mockContext, {
          sobjectName: 'Account; DROP TABLE User;--',
        })
      ).rejects.toThrow('Invalid sobject name');
      expect(mockClient.get).not.toHaveBeenCalled();
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

      expect(mockClient.get).toHaveBeenCalledWith(`${baseUrl}/services/data/v66.0/query`, {
        params: { q: 'SELECT Id FROM Account LIMIT 10' },
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

      expect(mockClient.get).toHaveBeenCalledWith(`${baseUrl}/services/data/v66.0/query`, {
        params: { q: 'SELECT Id FROM Contact LIMIT 50' },
      });
    });

    it('should use nextRecordsUrl when provided', async () => {
      const nextUrl = '/services/data/v66.0/query/01gxx0000001';
      mockClient.get.mockResolvedValue({ data: { records: [], done: true } });

      await SalesforceConnector.actions.list_records.handler(mockContext, {
        sobjectName: 'Account',
        nextRecordsUrl: nextUrl,
      });

      expect(mockClient.get).toHaveBeenCalledWith(`${baseUrl}${nextUrl}`, {});
    });

    it('should throw on invalid sobject name (SOQL injection safety)', async () => {
      await expect(
        SalesforceConnector.actions.list_records.handler(mockContext, {
          sobjectName: 'Account; DROP TABLE User;--',
        })
      ).rejects.toThrow('Invalid sobject name');
      expect(mockClient.get).not.toHaveBeenCalled();
    });
  });

  describe('download_file action', () => {
    it('should download file content and return base64', async () => {
      const fileContent = Buffer.from('Hello, file content');
      mockClient.get.mockResolvedValue({
        data: fileContent,
        headers: { 'content-type': 'application/pdf' },
      });

      const result = await SalesforceConnector.actions.download_file.handler(mockContext, {
        contentVersionId: '068xx000001AbcDEF',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${baseUrl}/services/data/v66.0/sobjects/ContentVersion/068xx000001AbcDEF/VersionData`,
        { responseType: 'arraybuffer' }
      );
      expect(result.base64).toBe(fileContent.toString('base64'));
      expect(result.contentType).toBe('application/pdf');
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

      expect(mockClient.get).toHaveBeenCalledWith(`${baseUrl}/services/data/v66.0/query`, {
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
