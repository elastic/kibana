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
import { registerPostImportWorkflowsPreflightRoute } from './post_import_workflows_preflight';
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

describe('POST /api/workflows/_import/preflight', () => {
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
    registerPostImportWorkflowsPreflightRoute({
      router: mockRouter,
      api: workflowsApi,
      logger: mockLogger,
      spaces: mockSpaces,
    });
    const postCall = (mockRouter.post as jest.Mock).mock.calls.find(
      (call: unknown[]) => (call[0] as { path: string }).path === '/api/workflows/_import/preflight'
    );
    return postCall?.[1];
  }

  function createRequest(content: Buffer | string, filename = 'workflow.yml') {
    return {
      body: { file: createFileStream(content, filename) },
      headers: {},
    };
  }

  it('should return yaml format with workflow preview for YAML content', async () => {
    const handler = getRouteHandler();
    workflowsApi.checkWorkflowConflicts = jest.fn().mockResolvedValue([]);

    const mockResponse = createMockResponse();
    const yaml =
      'name: Test\ndescription: A test\ntriggers:\n  - type: manual\nsteps:\n  - name: s1\n    type: console';
    await handler({}, createRequest(yaml, 'my-workflow.yml'), mockResponse);

    const body = (mockResponse.ok as jest.Mock).mock.calls[0][0].body;
    expect(body.format).toBe('yaml');
    expect(body.totalWorkflows).toBe(1);
    expect(body.conflicts).toEqual([]);
    expect(body.workflows).toHaveLength(1);
    expect(body.workflows[0]).toEqual(
      expect.objectContaining({
        id: 'my-workflow',
        name: 'Test',
        description: 'A test',
        triggers: [{ type: 'manual' }],
        stepCount: 1,
        valid: true,
      })
    );
  });

  it('should detect conflicts for YAML files whose ID matches an existing workflow', async () => {
    const handler = getRouteHandler();
    workflowsApi.checkWorkflowConflicts = jest
      .fn()
      .mockResolvedValue([{ id: 'existing', name: 'Existing WF' }]);

    const mockResponse = createMockResponse();
    await handler({}, createRequest('name: Test', 'existing.yml'), mockResponse);

    const body = (mockResponse.ok as jest.Mock).mock.calls[0][0].body;
    expect(body.conflicts).toHaveLength(1);
    expect(body.conflicts[0]).toEqual({ id: 'existing', existingName: 'Existing WF' });
  });

  it('should return zip format with workflow previews and no conflicts', async () => {
    const handler = getRouteHandler();
    const zipBuffer = await buildValidZip([
      {
        id: 'w-1',
        yaml: 'name: one\ntriggers:\n  - type: manual\nsteps:\n  - name: s1\n    type: console',
      },
      {
        id: 'w-2',
        yaml: 'name: two\ntriggers:\n  - type: alert\nsteps:\n  - name: s1\n    type: console',
      },
    ]);

    workflowsApi.checkWorkflowConflicts = jest.fn().mockResolvedValue([]);

    const mockResponse = createMockResponse();
    await handler({}, createRequest(zipBuffer), mockResponse);

    const body = (mockResponse.ok as jest.Mock).mock.calls[0][0].body;
    expect(body.format).toBe('zip');
    expect(body.totalWorkflows).toBe(2);
    expect(body.conflicts).toEqual([]);
    expect(body.workflows).toHaveLength(2);
    expect(body.workflows[0]).toEqual(
      expect.objectContaining({ id: 'w-1', name: 'one', triggers: [{ type: 'manual' }] })
    );
    expect(body.workflows[1]).toEqual(
      expect.objectContaining({ id: 'w-2', name: 'two', triggers: [{ type: 'alert' }] })
    );
  });

  it('should detect conflicts for existing workflow IDs in ZIP', async () => {
    const handler = getRouteHandler();
    const zipBuffer = await buildValidZip([
      {
        id: 'w-1',
        yaml: 'name: one\ntriggers:\n  - type: manual\nsteps:\n  - name: s1\n    type: console',
      },
      {
        id: 'w-2',
        yaml: 'name: two\ntriggers:\n  - type: manual\nsteps:\n  - name: s1\n    type: console',
      },
    ]);

    workflowsApi.checkWorkflowConflicts = jest
      .fn()
      .mockResolvedValue([{ id: 'w-1', name: 'Existing Workflow One' }]);

    const mockResponse = createMockResponse();
    await handler({}, createRequest(zipBuffer), mockResponse);

    const body = (mockResponse.ok as jest.Mock).mock.calls[0][0].body;
    expect(body.conflicts).toHaveLength(1);
    expect(body.conflicts[0]).toEqual({ id: 'w-1', existingName: 'Existing Workflow One' });
    expect(body.totalWorkflows).toBe(2);
    expect(body.workflows).toHaveLength(2);
  });

  it('should return 400 for empty files', async () => {
    const handler = getRouteHandler();
    const mockResponse = createMockResponse();
    await handler({}, createRequest(Buffer.alloc(0)), mockResponse);

    expect(mockResponse.badRequest).toHaveBeenCalledWith({
      body: { message: 'The uploaded file is empty' },
    });
  });

  it('should return 400 for non-readable streams', async () => {
    const handler = getRouteHandler();
    const mockResponse = createMockResponse();
    await handler({}, { body: { file: 'not a stream' }, headers: {} }, mockResponse);

    expect(mockResponse.badRequest).toHaveBeenCalledWith({
      body: { message: 'Expected a readable file stream' },
    });
  });

  it('should return 400 for an invalid ZIP archive', async () => {
    const handler = getRouteHandler();
    const invalidZip = Buffer.from([0x50, 0x4b, 0x00, 0x00, 0xff, 0xff]);

    const mockResponse = createMockResponse();
    await handler({}, createRequest(invalidZip), mockResponse);

    expect(mockResponse.badRequest).toHaveBeenCalled();
  });

  it('should return parse errors for non-.yml entries in ZIP', async () => {
    const handler = getRouteHandler();
    const zip = new AdmZip();
    zip.addFile('w-1.yml', Buffer.from('name: one'));
    zip.addFile('readme.txt', Buffer.from('not a workflow'));
    zip.addFile(
      'manifest.yml',
      Buffer.from(
        YAML.stringify({ exportedCount: 1, exportedAt: '2026-01-01T00:00:00Z', version: '1' })
      )
    );

    workflowsApi.checkWorkflowConflicts = jest.fn().mockResolvedValue([]);

    const mockResponse = createMockResponse();
    await handler({}, createRequest(await zip.toBufferPromise()), mockResponse);

    const body = (mockResponse.ok as jest.Mock).mock.calls[0][0].body;
    expect(body.totalWorkflows).toBe(1);
    expect(body.parseErrors).toHaveLength(1);
    expect(body.parseErrors[0]).toContain('not a .yml');
    expect(body.workflows).toHaveLength(1);
    expect(body.workflows[0].id).toBe('w-1');
  });
});
