/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import AdmZip from 'adm-zip';
import { Readable } from 'stream';
import YAML from 'yaml';
import { registerPostImportWorkflowsRoute } from './post_import_workflows';
import {
  createMockResponse,
  createMockRouterInstance,
  createMockWorkflowsApi,
  createSpacesMock,
  mockLogger,
} from './test_utils';
import type { WorkflowsManagementApi } from '../workflows_management_api';

jest.mock('../lib/with_license_check');

async function buildValidZip(workflows: Array<{ id: string; yaml: string }>): Promise<Buffer> {
  const zip = new AdmZip();
  for (const w of workflows) {
    zip.addFile(`${w.id}.yml`, Buffer.from(w.yaml, 'utf-8'));
  }
  const manifest = YAML.stringify({
    exportedCount: workflows.length,
    exportedAt: '2026-01-01T00:00:00.000Z',
    version: '1',
  });
  zip.addFile('manifest.yml', Buffer.from(manifest, 'utf-8'));
  return zip.toBufferPromise();
}

const createFileStream = (content: Buffer | string, filename = 'workflow.yml'): Readable => {
  const buf = typeof content === 'string' ? Buffer.from(content, 'utf-8') : content;
  const stream = Readable.from([buf]) as Readable & { hapi: { filename: string } };
  stream.hapi = { filename };
  return stream;
};

describe('POST /api/workflows/_import', () => {
  let workflowsApi: WorkflowsManagementApi;
  let mockRouter: ReturnType<typeof createMockRouterInstance>;
  let mockSpaces: ReturnType<typeof createSpacesMock>;

  beforeEach(() => {
    mockRouter = createMockRouterInstance();
    workflowsApi = createMockWorkflowsApi();
    mockSpaces = createSpacesMock();
    jest.clearAllMocks();
  });

  function getRouteHandler() {
    registerPostImportWorkflowsRoute({
      router: mockRouter,
      api: workflowsApi,
      logger: mockLogger,
      spaces: mockSpaces,
    });
    const postCall = (mockRouter.post as jest.Mock).mock.calls.find(
      (call: unknown[]) => (call[0] as { path: string }).path === '/api/workflows/_import'
    );
    return postCall?.[1];
  }

  function createRequest(
    content: Buffer | string,
    query: { overwrite?: boolean; generateNewIds?: boolean } = {},
    filename = 'workflow.yml'
  ) {
    return {
      body: { file: createFileStream(content, filename) },
      query: { overwrite: false, generateNewIds: false, ...query },
      headers: {},
      url: { pathname: '/api/workflows/_import' },
    };
  }

  describe('YAML import', () => {
    it('should import a single YAML workflow with ID derived from filename', async () => {
      const handler = getRouteHandler();
      const mockCreated = { id: 'my-workflow', name: 'Test', yaml: 'name: Test' };
      workflowsApi.createWorkflow = jest.fn().mockResolvedValue(mockCreated);

      const mockResponse = createMockResponse();
      await handler(
        {},
        createRequest('name: Test\nsteps: []', {}, 'my-workflow.yml'),
        mockResponse
      );

      expect(workflowsApi.createWorkflow).toHaveBeenCalledWith(
        { yaml: 'name: Test\nsteps: []', id: 'my-workflow' },
        'default',
        expect.anything()
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({
        body: { created: [mockCreated], failed: [], parseErrors: [] },
      });
    });

    it('should reject empty files', async () => {
      const handler = getRouteHandler();
      const mockResponse = createMockResponse();
      await handler({}, createRequest(Buffer.alloc(0)), mockResponse);

      expect(mockResponse.badRequest).toHaveBeenCalledWith({
        body: { message: 'The uploaded file is empty' },
      });
    });

    it('should reject whitespace-only YAML as empty', async () => {
      const handler = getRouteHandler();
      const mockResponse = createMockResponse();
      await handler({}, createRequest('   \n  \n  '), mockResponse);

      expect(mockResponse.badRequest).toHaveBeenCalledWith({
        body: { message: 'The uploaded file is empty' },
      });
    });
  });

  describe('ZIP import', () => {
    it('should import workflows from a ZIP archive', async () => {
      const handler = getRouteHandler();
      const zipBuffer = await buildValidZip([
        { id: 'w-1', yaml: 'name: one' },
        { id: 'w-2', yaml: 'name: two' },
      ]);

      const mockBulkResult = {
        created: [{ id: 'w-1' }, { id: 'w-2' }],
        failed: [],
      };
      workflowsApi.bulkCreateWorkflows = jest.fn().mockResolvedValue(mockBulkResult);
      workflowsApi.checkWorkflowConflicts = jest.fn().mockResolvedValue([]);

      const mockResponse = createMockResponse();
      await handler({}, createRequest(zipBuffer), mockResponse);

      expect(workflowsApi.bulkCreateWorkflows).toHaveBeenCalledWith(
        expect.arrayContaining([
          { id: 'w-1', yaml: 'name: one' },
          { id: 'w-2', yaml: 'name: two' },
        ]),
        'default',
        expect.anything()
      );
      expect(mockResponse.ok).toHaveBeenCalled();
    });

    it('should strip IDs when generateNewIds is true', async () => {
      const handler = getRouteHandler();
      const zipBuffer = await buildValidZip([{ id: 'w-1', yaml: 'name: one' }]);

      workflowsApi.bulkCreateWorkflows = jest
        .fn()
        .mockResolvedValue({ created: [{ id: 'w-new' }], failed: [] });

      const mockResponse = createMockResponse();
      await handler({}, createRequest(zipBuffer, { generateNewIds: true }), mockResponse);

      expect(workflowsApi.bulkCreateWorkflows).toHaveBeenCalledWith(
        [{ yaml: 'name: one' }],
        'default',
        expect.anything()
      );
    });

    it('should detect conflicts when neither overwrite nor generateNewIds is set', async () => {
      const handler = getRouteHandler();
      const zipBuffer = await buildValidZip([{ id: 'w-1', yaml: 'name: one' }]);

      workflowsApi.checkWorkflowConflicts = jest
        .fn()
        .mockResolvedValue([{ id: 'w-1', name: 'Existing Workflow' }]);

      const mockResponse = createMockResponse();
      await handler({}, createRequest(zipBuffer), mockResponse);

      expect(mockResponse.conflict).toHaveBeenCalled();
      const call = (mockResponse.conflict as jest.Mock).mock.calls[0][0];
      expect(call.body.attributes.conflicts).toHaveLength(1);
      expect(call.body.attributes.conflicts[0].existingName).toBe('Existing Workflow');
    });

    it('should skip conflict check when overwrite is true', async () => {
      const handler = getRouteHandler();
      const zipBuffer = await buildValidZip([{ id: 'w-1', yaml: 'name: one' }]);

      workflowsApi.bulkCreateWorkflows = jest
        .fn()
        .mockResolvedValue({ created: [{ id: 'w-1' }], failed: [] });

      const mockResponse = createMockResponse();
      await handler({}, createRequest(zipBuffer, { overwrite: true }), mockResponse);

      expect(workflowsApi.checkWorkflowConflicts).not.toHaveBeenCalled();
      expect(mockResponse.ok).toHaveBeenCalled();
    });

    it('should reject when both overwrite and generateNewIds are true', async () => {
      const handler = getRouteHandler();
      const mockResponse = createMockResponse();
      await handler(
        {},
        createRequest(Buffer.from('anything'), { overwrite: true, generateNewIds: true }),
        mockResponse
      );

      expect(mockResponse.badRequest).toHaveBeenCalledWith({
        body: { message: 'Cannot use [overwrite] with [generateNewIds]' },
      });
    });

    it('should return 400 for a ZIP with no valid workflow files', async () => {
      const handler = getRouteHandler();
      const zip = new AdmZip();
      zip.addFile(
        'manifest.yml',
        Buffer.from(
          YAML.stringify({ exportedCount: 0, exportedAt: '2026-01-01T00:00:00Z', version: '1' })
        )
      );
      zip.addFile('readme.txt', Buffer.from('not a workflow'));

      const mockResponse = createMockResponse();
      await handler({}, createRequest(await zip.toBufferPromise()), mockResponse);

      expect(mockResponse.badRequest).toHaveBeenCalled();
    });

    it('should return 400 for an invalid ZIP archive', async () => {
      const handler = getRouteHandler();
      // Create a buffer that starts with PK magic bytes but is not a valid ZIP
      const invalidZip = Buffer.from([0x50, 0x4b, 0x00, 0x00, 0xff, 0xff]);

      const mockResponse = createMockResponse();
      await handler({}, createRequest(invalidZip), mockResponse);

      expect(mockResponse.badRequest).toHaveBeenCalled();
    });

    it('should return 400 for ZIP without manifest', async () => {
      const handler = getRouteHandler();
      const zip = new AdmZip();
      zip.addFile('w-1.yml', Buffer.from('name: One'));

      const mockResponse = createMockResponse();
      await handler({}, createRequest(await zip.toBufferPromise()), mockResponse);

      expect(mockResponse.badRequest).toHaveBeenCalled();
      const msg = (mockResponse.badRequest as jest.Mock).mock.calls[0][0].body.message;
      expect(msg).toContain('manifest');
    });
  });

  describe('security edge cases', () => {
    it('should reject prototype pollution attempt in workflow ID', async () => {
      const handler = getRouteHandler();
      const zipBuffer = await buildValidZip([{ id: '__proto__', yaml: 'name: hack' }]);

      const mockResponse = createMockResponse();
      await handler({}, createRequest(zipBuffer), mockResponse);

      expect(workflowsApi.bulkCreateWorkflows).not.toHaveBeenCalled();
      expect(mockResponse.badRequest).toHaveBeenCalled();
    });

    it('should reject entries with oversized YAML content', async () => {
      const handler = getRouteHandler();
      const oversizedYaml = 'a'.repeat(1_024_001);
      const zipBuffer = await buildValidZip([{ id: 'big', yaml: oversizedYaml }]);

      const mockResponse = createMockResponse();
      await handler({}, createRequest(zipBuffer), mockResponse);

      // The ZIP has no valid workflows (all oversized), so it should fail
      expect(mockResponse.badRequest).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      const handler = getRouteHandler();
      workflowsApi.createWorkflow = jest.fn().mockRejectedValue(new Error('ES connection failed'));

      const mockResponse = createMockResponse();
      await handler({}, createRequest('name: Test'), mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: { message: expect.stringContaining('ES connection failed') },
      });
    });

    it('should reject non-readable streams', async () => {
      const handler = getRouteHandler();
      const mockResponse = createMockResponse();
      await handler(
        {},
        {
          body: { file: 'not a stream' },
          query: { overwrite: false, generateNewIds: false },
          headers: {},
        },
        mockResponse
      );

      expect(mockResponse.badRequest).toHaveBeenCalledWith({
        body: { message: 'Expected a readable file stream' },
      });
    });
  });
});
