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

interface ServiceNowListResponse {
  result: unknown[];
}

interface ServiceNowRecordResponse {
  result: unknown;
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

    it('should combine full-text query with encodedQuery filter', async () => {
      const mockResponse = { data: { result: [] } };
      mockClient.get.mockResolvedValue(mockResponse);

      await ServicenowSearch.actions.search.handler(mockContext, {
        table: 'incident',
        query: 'VPN',
        encodedQuery: 'active=true^priority=1',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://test-instance.service-now.com/api/now/table/incident',
        {
          params: {
            sysparm_query: 'GOTO123TEXTQUERY321=VPN^active=true^priority=1',
            sysparm_limit: 20,
            sysparm_display_value: 'true',
          },
        }
      );
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

    it('should fetch a knowledge article via getRecord with the appropriate fields', async () => {
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

      const result = (await ServicenowSearch.actions.getRecord.handler(mockContext, {
        table: 'kb_knowledge',
        sysId: 'kb-123',
        fields:
          'sys_id,number,short_description,text,topic,category,author,sys_created_on,sys_updated_on,workflow_state,kb_knowledge_base,kb_category',
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
      mockClient.get.mockResolvedValueOnce(metaResponse).mockResolvedValueOnce(contentResponse);

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

    it('should propagate content download errors after successful metadata fetch', async () => {
      const metaResponse = {
        data: {
          result: {
            sys_id: 'att-123',
            file_name: 'report.pdf',
            content_type: 'application/pdf',
          },
        },
      };
      mockClient.get
        .mockResolvedValueOnce(metaResponse)
        .mockRejectedValueOnce(new Error('Content download failed'));

      await expect(
        ServicenowSearch.actions.getAttachment.handler(mockContext, { sysId: 'att-123' })
      ).rejects.toThrow('Content download failed');
    });
  });

  describe('listTables action', () => {
    it('should list tables with no filter', async () => {
      const mockResponse = {
        data: {
          result: [
            { name: 'incident', label: 'Incident', super_class: '', sys_package: 'ITSM' },
            { name: 'kb_knowledge', label: 'Knowledge', super_class: '', sys_package: 'Knowledge' },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await ServicenowSearch.actions.listTables.handler(
        mockContext,
        {}
      )) as ServiceNowListResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://test-instance.service-now.com/api/now/table/sys_db_object',
        {
          params: {
            sysparm_limit: 50,
            sysparm_fields: 'name,label,super_class,sys_package',
            sysparm_display_value: 'true',
          },
        }
      );
      expect(result.result).toHaveLength(2);
    });

    it('should list tables with a query filter', async () => {
      const mockResponse = {
        data: { result: [{ name: 'incident', label: 'Incident' }] },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      await ServicenowSearch.actions.listTables.handler(mockContext, {
        query: 'incident',
        limit: 10,
        offset: 0,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://test-instance.service-now.com/api/now/table/sys_db_object',
        {
          params: {
            sysparm_limit: 10,
            sysparm_fields: 'name,label,super_class,sys_package',
            sysparm_display_value: 'true',
            sysparm_query: 'nameLIKEincident^ORlabelLIKEincident',
            sysparm_offset: 0,
          },
        }
      );
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Forbidden'));

      await expect(ServicenowSearch.actions.listTables.handler(mockContext, {})).rejects.toThrow(
        'Forbidden'
      );
    });
  });

  describe('listKnowledgeBases action', () => {
    it('should list active knowledge bases', async () => {
      const mockResponse = {
        data: {
          result: [
            {
              sys_id: 'kb-base-1',
              title: 'IT Knowledge Base',
              description: 'IT support articles',
              active: 'true',
            },
            {
              sys_id: 'kb-base-2',
              title: 'HR Policies',
              description: 'HR documentation',
              active: 'true',
            },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await ServicenowSearch.actions.listKnowledgeBases.handler(
        mockContext,
        {}
      )) as ServiceNowListResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://test-instance.service-now.com/api/now/table/kb_knowledge_base',
        {
          params: {
            sysparm_limit: 20,
            sysparm_fields: 'sys_id,title,description,active,kb_managers',
            sysparm_display_value: 'true',
            sysparm_query: 'active=true',
          },
        }
      );
      expect(result.result).toHaveLength(2);
    });

    it('should support pagination', async () => {
      const mockResponse = { data: { result: [] } };
      mockClient.get.mockResolvedValue(mockResponse);

      await ServicenowSearch.actions.listKnowledgeBases.handler(mockContext, {
        limit: 5,
        offset: 10,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://test-instance.service-now.com/api/now/table/kb_knowledge_base',
        {
          params: {
            sysparm_limit: 5,
            sysparm_fields: 'sys_id,title,description,active,kb_managers',
            sysparm_display_value: 'true',
            sysparm_query: 'active=true',
            sysparm_offset: 10,
          },
        }
      );
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Unauthorized'));

      await expect(
        ServicenowSearch.actions.listKnowledgeBases.handler(mockContext, {})
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('getComments action', () => {
    it('should retrieve comments and work notes for a record', async () => {
      const mockResponse = {
        data: {
          result: [
            {
              sys_id: 'journal-1',
              element: 'comments',
              value: 'User reported VPN issue on Monday',
              sys_created_on: '2024-01-15 09:00:00',
              sys_created_by: 'john.doe',
            },
            {
              sys_id: 'journal-2',
              element: 'work_notes',
              value: 'Assigned to network team for investigation',
              sys_created_on: '2024-01-15 10:30:00',
              sys_created_by: 'jane.smith',
            },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await ServicenowSearch.actions.getComments.handler(mockContext, {
        tableName: 'incident',
        recordSysId: 'inc-123',
      })) as ServiceNowListResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://test-instance.service-now.com/api/now/table/sys_journal_field',
        {
          params: {
            sysparm_query:
              'element_id=inc-123^name=incident^element=comments^NQelement_id=inc-123^name=incident^element=work_notes^ORDERBYsys_created_on',
            sysparm_limit: 20,
            sysparm_fields: 'sys_id,element,value,sys_created_on,sys_created_by',
            sysparm_display_value: 'true',
          },
        }
      );
      expect(result.result).toHaveLength(2);
    });

    it('should support pagination', async () => {
      const mockResponse = { data: { result: [] } };
      mockClient.get.mockResolvedValue(mockResponse);

      await ServicenowSearch.actions.getComments.handler(mockContext, {
        tableName: 'change_request',
        recordSysId: 'chg-456',
        limit: 5,
        offset: 10,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://test-instance.service-now.com/api/now/table/sys_journal_field',
        {
          params: {
            sysparm_query:
              'element_id=chg-456^name=change_request^element=comments^NQelement_id=chg-456^name=change_request^element=work_notes^ORDERBYsys_created_on',
            sysparm_limit: 5,
            sysparm_fields: 'sys_id,element,value,sys_created_on,sys_created_by',
            sysparm_display_value: 'true',
            sysparm_offset: 10,
          },
        }
      );
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Record not found'));

      await expect(
        ServicenowSearch.actions.getComments.handler(mockContext, {
          tableName: 'incident',
          recordSysId: 'nonexistent',
        })
      ).rejects.toThrow('Record not found');
    });
  });

  describe('describeTable action', () => {
    it('should describe a table using the schema API', async () => {
      const mockResponse = {
        data: {
          result: {
            columns: {
              assigned_to: {
                label: 'Assigned to',
                type: 'reference',
                max_length: 32,
                mandatory: false,
                reference: 'sys_user',
              },
              number: {
                label: 'Number',
                type: 'string',
                max_length: 40,
                mandatory: false,
              },
            },
          },
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await ServicenowSearch.actions.describeTable.handler(mockContext, {
        table: 'incident',
      })) as { result: { columns: Record<string, unknown> } };

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://test-instance.service-now.com/api/now/doc/table/schema/incident',
        {}
      );
      expect(result.result.columns).toHaveProperty('assigned_to');
      expect(result.result.columns).toHaveProperty('number');
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Access denied'));

      await expect(
        ServicenowSearch.actions.describeTable.handler(mockContext, {
          table: 'incident',
        })
      ).rejects.toThrow('Access denied');
    });
  });

  describe('test handler', () => {
    it('should return success when API is accessible', async () => {
      const mockResponse = {
        data: {
          result: [{ sys_id: 'user-123' }],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      if (!ServicenowSearch.test) {
        throw new Error('Test handler not defined');
      }
      const result = (await ServicenowSearch.test.handler(mockContext)) as TestResult;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://test-instance.service-now.com/api/now/table/sys_user',
        {
          params: {
            sysparm_query: 'sys_created_on!=NULL',
            sysparm_limit: 1,
            sysparm_fields: 'sys_id',
          },
        }
      );
      expect(result.ok).toBe(true);
      expect(result.message).toBe('Successfully connected to ServiceNow');
    });

    it('should return success when user table returns no rows', async () => {
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
      expect(result.message).toBe('Successfully connected to ServiceNow (no user records visible)');
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
