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
    patch: jest.fn(),
    delete: jest.fn(),
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

  describe('auth', () => {
    it('supports oauth_client_credentials auth', () => {
      const types = (ServicenowSearch.auth?.types as Array<string | { type: string }>).map((t) =>
        typeof t === 'string' ? t : t.type
      );
      expect(types).toContain('oauth_client_credentials');
    });

    it('supports oauth_authorization_code', () => {
      const oauthType = (
        ServicenowSearch.auth?.types as Array<
          string | { type: string; defaults?: Record<string, unknown> }
        >
      ).find((t) => typeof t === 'object' && t.type === 'oauth_authorization_code');
      expect(oauthType).toBeDefined();
      expect(oauthType).toMatchObject({
        type: 'oauth_authorization_code',
        defaults: {},
      });
    });
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

  describe('createRecord action', () => {
    it('should create a record in the given table', async () => {
      const mockResponse = {
        data: {
          result: { sys_id: 'new-rec-1', number: 'CHG0010001', short_description: 'Deploy patch' },
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = (await ServicenowSearch.actions.createRecord.handler(mockContext, {
        table: 'change_request',
        fields: { short_description: 'Deploy patch', category: 'Software' },
      })) as ServiceNowRecordResponse;

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://test-instance.service-now.com/api/now/table/change_request',
        { short_description: 'Deploy patch', category: 'Software' },
        { params: { sysparm_display_value: 'true' } }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should propagate API errors', async () => {
      mockClient.post.mockRejectedValue(new Error('Forbidden'));

      await expect(
        ServicenowSearch.actions.createRecord.handler(mockContext, {
          table: 'incident',
          fields: { short_description: 'Test' },
        })
      ).rejects.toThrow('Forbidden');
    });
  });

  describe('updateRecord action', () => {
    it('should update a record by sys_id', async () => {
      const mockResponse = {
        data: { result: { sys_id: 'rec-1', state: '2', short_description: 'Updated' } },
      };
      mockClient.patch.mockResolvedValue(mockResponse);

      const result = (await ServicenowSearch.actions.updateRecord.handler(mockContext, {
        table: 'change_request',
        sysId: 'rec-1',
        fields: { state: '2' },
      })) as ServiceNowRecordResponse;

      expect(mockClient.patch).toHaveBeenCalledWith(
        'https://test-instance.service-now.com/api/now/table/change_request/rec-1',
        { state: '2' },
        { params: { sysparm_display_value: 'true' } }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should propagate API errors', async () => {
      mockClient.patch.mockRejectedValue(new Error('Record not found'));

      await expect(
        ServicenowSearch.actions.updateRecord.handler(mockContext, {
          table: 'incident',
          sysId: 'nonexistent',
          fields: { state: '2' },
        })
      ).rejects.toThrow('Record not found');
    });
  });

  describe('createIncident action', () => {
    it('should create an incident with required and optional fields', async () => {
      const mockResponse = {
        data: {
          result: {
            sys_id: 'inc-new-1',
            number: 'INC0020001',
            short_description: 'Cannot login',
            impact: '2',
            urgency: '2',
          },
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = (await ServicenowSearch.actions.createIncident.handler(mockContext, {
        short_description: 'Cannot login',
        impact: '2',
        urgency: '2',
        caller_id: 'john.doe',
      })) as ServiceNowRecordResponse;

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://test-instance.service-now.com/api/now/table/incident',
        { short_description: 'Cannot login', impact: '2', urgency: '2', caller_id: 'john.doe' },
        { params: { sysparm_display_value: 'true' } }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should create an incident with only short_description', async () => {
      const mockResponse = {
        data: { result: { sys_id: 'inc-new-2', number: 'INC0020002' } },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      await ServicenowSearch.actions.createIncident.handler(mockContext, {
        short_description: 'Printer not working',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://test-instance.service-now.com/api/now/table/incident',
        { short_description: 'Printer not working' },
        { params: { sysparm_display_value: 'true' } }
      );
    });

    it('should propagate API errors', async () => {
      mockClient.post.mockRejectedValue(new Error('Validation error'));

      await expect(
        ServicenowSearch.actions.createIncident.handler(mockContext, {
          short_description: 'Test incident',
        })
      ).rejects.toThrow('Validation error');
    });
  });

  describe('updateIncident action', () => {
    it('should update an incident by sys_id', async () => {
      const mockResponse = {
        data: { result: { sys_id: 'inc-1', state: '2', assigned_to: 'jane.smith' } },
      };
      mockClient.patch.mockResolvedValue(mockResponse);

      const result = (await ServicenowSearch.actions.updateIncident.handler(mockContext, {
        sysId: 'inc-1',
        state: '2',
        assigned_to: 'jane.smith',
      })) as ServiceNowRecordResponse;

      expect(mockClient.patch).toHaveBeenCalledWith(
        'https://test-instance.service-now.com/api/now/table/incident/inc-1',
        { state: '2', assigned_to: 'jane.smith' },
        { params: { sysparm_display_value: 'true' } }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should propagate API errors', async () => {
      mockClient.patch.mockRejectedValue(new Error('Incident not found'));

      await expect(
        ServicenowSearch.actions.updateIncident.handler(mockContext, {
          sysId: 'nonexistent',
          state: '2',
        })
      ).rejects.toThrow('Incident not found');
    });
  });

  describe('addComment action', () => {
    it('should add a customer-visible comment to a record', async () => {
      const mockResponse = {
        data: { result: { sys_id: 'inc-1', comments: 'User confirmed VPN issue on Monday' } },
      };
      mockClient.patch.mockResolvedValue(mockResponse);

      const result = (await ServicenowSearch.actions.addComment.handler(mockContext, {
        table: 'incident',
        sysId: 'inc-1',
        comment: 'User confirmed VPN issue on Monday',
      })) as ServiceNowRecordResponse;

      expect(mockClient.patch).toHaveBeenCalledWith(
        'https://test-instance.service-now.com/api/now/table/incident/inc-1',
        { comments: 'User confirmed VPN issue on Monday' },
        { params: { sysparm_display_value: 'true' } }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should propagate API errors', async () => {
      mockClient.patch.mockRejectedValue(new Error('Record not found'));

      await expect(
        ServicenowSearch.actions.addComment.handler(mockContext, {
          table: 'incident',
          sysId: 'nonexistent',
          comment: 'test',
        })
      ).rejects.toThrow('Record not found');
    });
  });

  describe('addWorkNote action', () => {
    it('should add an internal work note to a record', async () => {
      const mockResponse = {
        data: { result: { sys_id: 'inc-1', work_notes: 'Assigned to network team' } },
      };
      mockClient.patch.mockResolvedValue(mockResponse);

      const result = (await ServicenowSearch.actions.addWorkNote.handler(mockContext, {
        table: 'incident',
        sysId: 'inc-1',
        workNote: 'Assigned to network team',
      })) as ServiceNowRecordResponse;

      expect(mockClient.patch).toHaveBeenCalledWith(
        'https://test-instance.service-now.com/api/now/table/incident/inc-1',
        { work_notes: 'Assigned to network team' },
        { params: { sysparm_display_value: 'true' } }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should propagate API errors', async () => {
      mockClient.patch.mockRejectedValue(new Error('Access denied'));

      await expect(
        ServicenowSearch.actions.addWorkNote.handler(mockContext, {
          table: 'incident',
          sysId: 'inc-1',
          workNote: 'test',
        })
      ).rejects.toThrow('Access denied');
    });
  });

  describe('closeIncident action', () => {
    it('should close an incident with state 6 (Resolved)', async () => {
      const mockResponse = {
        data: { result: { sys_id: 'inc-1', state: '6', close_code: 'Solved (Permanently)' } },
      };
      mockClient.patch.mockResolvedValue(mockResponse);

      const result = (await ServicenowSearch.actions.closeIncident.handler(mockContext, {
        sysId: 'inc-1',
        closeCode: 'Solved (Permanently)',
        closeNotes: 'Reinstalled VPN client and verified connectivity',
        state: '6',
      })) as ServiceNowRecordResponse;

      expect(mockClient.patch).toHaveBeenCalledWith(
        'https://test-instance.service-now.com/api/now/table/incident/inc-1',
        {
          state: '6',
          close_code: 'Solved (Permanently)',
          close_notes: 'Reinstalled VPN client and verified connectivity',
        },
        { params: { sysparm_display_value: 'true' } }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should propagate API errors', async () => {
      mockClient.patch.mockRejectedValue(new Error('Invalid state transition'));

      await expect(
        ServicenowSearch.actions.closeIncident.handler(mockContext, {
          sysId: 'inc-1',
          closeCode: 'Solved',
          closeNotes: 'Fixed',
          state: '6',
        })
      ).rejects.toThrow('Invalid state transition');
    });
  });

  describe('createSecurityIncident action', () => {
    it('should create a security incident in sn_si_incident', async () => {
      const mockResponse = {
        data: {
          result: {
            sys_id: 'si-new-1',
            number: 'SIR0010001',
            short_description: 'Phishing campaign detected',
          },
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = (await ServicenowSearch.actions.createSecurityIncident.handler(mockContext, {
        short_description: 'Phishing campaign detected',
        priority: '2',
        category: 'Phishing',
      })) as ServiceNowRecordResponse;

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://test-instance.service-now.com/api/now/table/sn_si_incident',
        { short_description: 'Phishing campaign detected', priority: '2', category: 'Phishing' },
        { params: { sysparm_display_value: 'true' } }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should propagate API errors', async () => {
      mockClient.post.mockRejectedValue(new Error('Table not found'));

      await expect(
        ServicenowSearch.actions.createSecurityIncident.handler(mockContext, {
          short_description: 'Test security incident',
        })
      ).rejects.toThrow('Table not found');
    });
  });

  describe('createEvent action', () => {
    it('should send an ITOM event with required fields', async () => {
      const mockResponse = { data: { result: 'inserted 1 events' } };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = await ServicenowSearch.actions.createEvent.handler(mockContext, {
        source: 'Elastic',
        type: 'high_cpu',
        node: 'web-server-01',
        severity: '2',
        description: 'CPU usage exceeded 95%',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://test-instance.service-now.com/api/now/em/event',
        {
          records: [
            {
              source: 'Elastic',
              type: 'high_cpu',
              node: 'web-server-01',
              severity: '2',
              description: 'CPU usage exceeded 95%',
            },
          ],
        }
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should serialize additional_info as JSON string', async () => {
      const mockResponse = { data: { result: 'inserted 1 events' } };
      mockClient.post.mockResolvedValue(mockResponse);

      await ServicenowSearch.actions.createEvent.handler(mockContext, {
        source: 'Elastic',
        type: 'alert',
        additional_info: { alert_id: 'a-123', severity_label: 'critical' },
      });

      const callArgs = mockClient.post.mock.calls[0];
      const body = callArgs[1] as { records: Array<Record<string, unknown>> };
      expect(typeof body.records[0].additional_info).toBe('string');
      expect(JSON.parse(body.records[0].additional_info as string)).toEqual({
        alert_id: 'a-123',
        severity_label: 'critical',
      });
    });

    it('should propagate API errors', async () => {
      mockClient.post.mockRejectedValue(new Error('Event Management not enabled'));

      await expect(
        ServicenowSearch.actions.createEvent.handler(mockContext, {
          source: 'Elastic',
          type: 'test_event',
        })
      ).rejects.toThrow('Event Management not enabled');
    });
  });

  describe('uploadAttachment action', () => {
    it('should upload a base64-encoded file to a record', async () => {
      const mockResponse = {
        data: {
          result: {
            sys_id: 'att-new-1',
            file_name: 'screenshot.png',
            content_type: 'image/png',
            size_bytes: '1024',
          },
        },
      };
      mockClient.post.mockResolvedValue(mockResponse);

      const result = (await ServicenowSearch.actions.uploadAttachment.handler(mockContext, {
        tableName: 'incident',
        tableSysId: 'inc-1',
        fileName: 'screenshot.png',
        contentType: 'image/png',
        base64Content:
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      })) as ServiceNowRecordResponse;

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://test-instance.service-now.com/api/now/attachment/file',
        expect.any(Buffer),
        expect.objectContaining({
          params: { table_name: 'incident', table_sys_id: 'inc-1', file_name: 'screenshot.png' },
          headers: { 'Content-Type': 'image/png' },
        })
      );
      expect(result).toEqual(mockResponse.data);
    });

    it('should propagate API errors', async () => {
      mockClient.post.mockRejectedValue(new Error('Attachment upload failed'));

      await expect(
        ServicenowSearch.actions.uploadAttachment.handler(mockContext, {
          tableName: 'incident',
          tableSysId: 'inc-1',
          fileName: 'file.txt',
          contentType: 'text/plain',
          base64Content: 'aGVsbG8=',
        })
      ).rejects.toThrow('Attachment upload failed');
    });
  });

  describe('deleteRecord action', () => {
    it('should delete a record and return confirmation', async () => {
      mockClient.delete.mockResolvedValue({ status: 204, data: '' });

      const result = (await ServicenowSearch.actions.deleteRecord.handler(mockContext, {
        table: 'incident',
        sysId: 'inc-to-delete',
      })) as { deleted: boolean; table: string; sysId: string };

      expect(mockClient.delete).toHaveBeenCalledWith(
        'https://test-instance.service-now.com/api/now/table/incident/inc-to-delete'
      );
      expect(result).toEqual({ deleted: true, table: 'incident', sysId: 'inc-to-delete' });
    });

    it('should propagate API errors', async () => {
      mockClient.delete.mockRejectedValue(new Error('Forbidden'));

      await expect(
        ServicenowSearch.actions.deleteRecord.handler(mockContext, {
          table: 'incident',
          sysId: 'inc-1',
        })
      ).rejects.toThrow('Forbidden');
    });
  });

  describe('getChoices action', () => {
    it('should return choice values for an incident field', async () => {
      const mockResponse = {
        data: {
          result: [
            { value: '1', label: 'New', sequence: '0' },
            { value: '2', label: 'In Progress', sequence: '1' },
            { value: '6', label: 'Resolved', sequence: '2' },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await ServicenowSearch.actions.getChoices.handler(mockContext, {
        tableName: 'incident',
        fieldName: 'state',
      })) as ServiceNowListResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://test-instance.service-now.com/api/now/table/sys_choice',
        {
          params: {
            sysparm_query: 'name=incident^element=state^language=en^inactive=false',
            sysparm_fields: 'value,label,sequence',
            sysparm_display_value: 'true',
            sysparm_limit: 100,
          },
        }
      );
      expect(result.result).toHaveLength(3);
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Unauthorized'));

      await expect(
        ServicenowSearch.actions.getChoices.handler(mockContext, {
          tableName: 'incident',
          fieldName: 'state',
        })
      ).rejects.toThrow('Unauthorized');
    });
  });

  describe('queryUsers action', () => {
    it('should search users by query string', async () => {
      const mockResponse = {
        data: {
          result: [
            {
              sys_id: 'user-1',
              user_name: 'john.doe',
              name: 'John Doe',
              email: 'john.doe@example.com',
              active: 'true',
            },
          ],
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await ServicenowSearch.actions.queryUsers.handler(mockContext, {
        query: 'john',
        limit: 10,
      })) as ServiceNowListResponse;

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://test-instance.service-now.com/api/now/table/sys_user',
        {
          params: {
            sysparm_limit: 10,
            sysparm_fields: 'sys_id,user_name,name,email,department,title,active',
            sysparm_display_value: 'true',
            sysparm_query: 'nameLIKEjohn^ORemailLIKEjohn^ORuser_nameLIKEjohn',
          },
        }
      );
      expect(result.result).toHaveLength(1);
    });

    it('should list users without a query', async () => {
      const mockResponse = { data: { result: [] } };
      mockClient.get.mockResolvedValue(mockResponse);

      await ServicenowSearch.actions.queryUsers.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenCalledWith(
        'https://test-instance.service-now.com/api/now/table/sys_user',
        {
          params: {
            sysparm_limit: 20,
            sysparm_fields: 'sys_id,user_name,name,email,department,title,active',
            sysparm_display_value: 'true',
          },
        }
      );
    });

    it('should propagate API errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Forbidden'));

      await expect(
        ServicenowSearch.actions.queryUsers.handler(mockContext, { query: 'admin' })
      ).rejects.toThrow('Forbidden');
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
