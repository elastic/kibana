/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { ServicenowSearch } from './servicenow_search';

interface ServiceNowListResponse<T = unknown> {
  result: T[];
}

interface ServiceNowRecordResponse<T = unknown> {
  result: T;
}

interface TestResult {
  ok: boolean;
  message?: string;
}

describe('ServicenowSearch', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
    request: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    log: { debug: jest.fn(), error: jest.fn() },
    config: { instanceUrl: 'https://test-instance.service-now.com' },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('search action', () => {
    it('should search with required parameters', async () => {
      const mockResponse = {
        data: {
          result: [
            {
              sys_id: 'inc-1',
              number: 'INC0010001',
              short_description: 'Cannot connect to VPN',
            },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await ServicenowSearch.actions.search.handler(mockContext, {
        table: 'incident',
        query: 'VPN connection',
      })) as ServiceNowListResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://test-instance.service-now.com/api/now/table/incident',
        {
          params: {
            sysparm_query: 'GOTO123TEXTQUERY321=VPN connection',
            sysparm_limit: 20,
            sysparm_display_value: 'true',
          },
        }
      );
      expect(mockContext.log.debug).toHaveBeenCalledWith(
        'ServiceNow searching incident for: VPN connection'
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should search with optional parameters', async () => {
      const mockResponse = {
        data: {
          result: [],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await ServicenowSearch.actions.search.handler(mockContext, {
        table: 'kb_knowledge',
        query: 'password reset',
        fields: 'sys_id,number,short_description',
        limit: 5,
        offset: 10,
      })) as ServiceNowListResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://test-instance.service-now.com/api/now/table/kb_knowledge',
        {
          params: {
            sysparm_query: 'GOTO123TEXTQUERY321=password reset',
            sysparm_limit: 5,
            sysparm_offset: 10,
            sysparm_fields: 'sys_id,number,short_description',
            sysparm_display_value: 'true',
          },
        }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should handle empty results', async () => {
      const mockResponse = {
        data: {
          result: [],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await ServicenowSearch.actions.search.handler(mockContext, {
        table: 'incident',
        query: 'nonexistent issue',
      })) as ServiceNowListResponse;

      expect(result.result).toHaveLength(0);
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Access denied'));

      await expect(
        ServicenowSearch.actions.search.handler(mockContext, {
          table: 'incident',
          query: 'test',
        })
      ).rejects.toThrow('Access denied');
    });
  });

  describe('getRecord action', () => {
    it('should get a record by sys_id', async () => {
      const mockResponse = {
        data: {
          result: {
            sys_id: 'abc-123',
            number: 'INC0010001',
            short_description: 'VPN issue',
            description: 'Full description of the VPN issue',
            state: 'In Progress',
          },
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await ServicenowSearch.actions.getRecord.handler(mockContext, {
        table: 'incident',
        sysId: 'abc-123',
      })) as ServiceNowRecordResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://test-instance.service-now.com/api/now/table/incident/abc-123',
        {
          params: {
            sysparm_display_value: 'true',
          },
        }
      );
      expect(mockContext.log.debug).toHaveBeenCalledWith(
        'ServiceNow getting record abc-123 from incident'
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should get a record with specific fields', async () => {
      const mockResponse = {
        data: {
          result: {
            sys_id: 'abc-123',
            number: 'INC0010001',
          },
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await ServicenowSearch.actions.getRecord.handler(mockContext, {
        table: 'incident',
        sysId: 'abc-123',
        fields: 'sys_id,number',
      })) as ServiceNowRecordResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://test-instance.service-now.com/api/now/table/incident/abc-123',
        {
          params: {
            sysparm_display_value: 'true',
            sysparm_fields: 'sys_id,number',
          },
        }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should propagate not found errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Record not found'));

      await expect(
        ServicenowSearch.actions.getRecord.handler(mockContext, {
          table: 'incident',
          sysId: 'nonexistent',
        })
      ).rejects.toThrow('Record not found');
    });
  });

  describe('listRecords action', () => {
    it('should list records from a table', async () => {
      const mockResponse = {
        data: {
          result: [
            { sys_id: '1', number: 'INC001', short_description: 'Issue 1' },
            { sys_id: '2', number: 'INC002', short_description: 'Issue 2' },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await ServicenowSearch.actions.listRecords.handler(mockContext, {
        table: 'incident',
      })) as ServiceNowListResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://test-instance.service-now.com/api/now/table/incident',
        {
          params: {
            sysparm_limit: 20,
            sysparm_display_value: 'true',
          },
        }
      );
      expect(result.result).toHaveLength(2);
    });

    it('should list records with encoded query filter', async () => {
      const mockResponse = {
        data: { result: [] },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      await ServicenowSearch.actions.listRecords.handler(mockContext, {
        table: 'incident',
        encodedQuery: 'active=true^priority=1',
        fields: 'sys_id,number,short_description',
        limit: 10,
        offset: 5,
        orderBy: '-sys_created_on',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://test-instance.service-now.com/api/now/table/incident',
        {
          params: {
            sysparm_limit: 10,
            sysparm_display_value: 'true',
            sysparm_query: 'active=true^priority=1',
            sysparm_fields: 'sys_id,number,short_description',
            sysparm_offset: 5,
            sysparm_orderby: '-sys_created_on',
          },
        }
      );
    });

    it('should handle empty results', async () => {
      const mockResponse = {
        data: { result: [] },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await ServicenowSearch.actions.listRecords.handler(mockContext, {
        table: 'change_request',
      })) as ServiceNowListResponse;

      expect(result.result).toHaveLength(0);
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Table not found'));

      await expect(
        ServicenowSearch.actions.listRecords.handler(mockContext, {
          table: 'nonexistent_table',
        })
      ).rejects.toThrow('Table not found');
    });
  });

  describe('getKnowledgeArticle action', () => {
    it('should retrieve a knowledge article', async () => {
      const mockResponse = {
        data: {
          result: {
            sys_id: 'kb-123',
            number: 'KB0010001',
            short_description: 'How to reset password',
            text: '<p>Full article body content here</p>',
            workflow_state: 'published',
          },
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await ServicenowSearch.actions.getKnowledgeArticle.handler(mockContext, {
        sysId: 'kb-123',
      })) as ServiceNowRecordResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://test-instance.service-now.com/api/now/table/kb_knowledge/kb-123',
        {
          params: {
            sysparm_display_value: 'true',
            sysparm_fields:
              'sys_id,number,short_description,text,topic,category,author,sys_created_on,sys_updated_on,workflow_state,kb_knowledge_base,kb_category',
          },
        }
      );
      expect(mockContext.log.debug).toHaveBeenCalledWith(
        'ServiceNow getting knowledge article kb-123'
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should propagate not found errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Record not found'));

      await expect(
        ServicenowSearch.actions.getKnowledgeArticle.handler(mockContext, {
          sysId: 'nonexistent',
        })
      ).rejects.toThrow('Record not found');
    });
  });

  describe('getAttachment action', () => {
    it('should download an attachment as base64', async () => {
      const metaResponse = {
        data: {
          result: {
            sys_id: 'att-123',
            file_name: 'report.pdf',
            content_type: 'application/pdf',
          },
        },
      };
      const contentResponse = {
        data: Uint8Array.from([72, 101, 108, 108, 111]),
      };
      mockClient.get
        .mockResolvedValueOnce(metaResponse)
        .mockResolvedValueOnce(contentResponse);

      const result = (await ServicenowSearch.actions.getAttachment.handler(mockContext, {
        sysId: 'att-123',
      })) as { fileName: string; contentType: string; base64: string };

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://test-instance.service-now.com/api/now/attachment/att-123',
        {}
      );
      expect(mockClient.get).toHaveBeenCalledWith(
        'https://test-instance.service-now.com/api/now/attachment/att-123/file',
        { responseType: 'arraybuffer' }
      );
      expect(result).toEqual({
        fileName: 'report.pdf',
        contentType: 'application/pdf',
        base64: 'SGVsbG8=',
      });
    });

    it('should propagate attachment not found errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Attachment not found'));

      await expect(
        ServicenowSearch.actions.getAttachment.handler(mockContext, {
          sysId: 'nonexistent',
        })
      ).rejects.toThrow('Attachment not found');
    });
  });

  describe('test handler', () => {
    it('should return success when API is accessible', async () => {
      const mockResponse = {
        data: {
          result: [{ name: 'instance_name', value: 'test-instance' }],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      if (!ServicenowSearch.test) {
        throw new Error('Test handler not defined');
      }
      const result = (await ServicenowSearch.test.handler(mockContext)) as TestResult;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://test-instance.service-now.com/api/now/table/sys_properties',
        {
          params: {
            sysparm_query: 'name=instance_name',
            sysparm_limit: 1,
            sysparm_fields: 'name,value',
          },
        }
      );
      expect(result.ok).toBe(true);
      expect(result.message).toBe('Successfully connected to ServiceNow instance: test-instance');
    });

    it('should handle missing instance name property', async () => {
      const mockResponse = {
        data: {
          result: [],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      if (!ServicenowSearch.test) {
        throw new Error('Test handler not defined');
      }
      const result = (await ServicenowSearch.test.handler(mockContext)) as TestResult;

      expect(result.ok).toBe(true);
      expect(result.message).toBe('Successfully connected to ServiceNow instance: Unknown');
    });

    it('should return failure when API is not accessible', async () => {
      mockClient.get.mockRejectedValue(new Error('Invalid credentials'));

      if (!ServicenowSearch.test) {
        throw new Error('Test handler not defined');
      }
      const result = (await ServicenowSearch.test.handler(mockContext)) as TestResult;

      expect(result.ok).toBe(false);
      expect(result.message).toBe('Invalid credentials');
    });

    it('should handle network errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Network timeout'));

      if (!ServicenowSearch.test) {
        throw new Error('Test handler not defined');
      }
      const result = (await ServicenowSearch.test.handler(mockContext)) as TestResult;

      expect(result.ok).toBe(false);
      expect(result.message).toBe('Network timeout');
    });
  });
});
