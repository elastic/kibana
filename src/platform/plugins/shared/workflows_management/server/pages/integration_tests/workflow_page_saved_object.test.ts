/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { SPACES_EXTENSION_ID } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { createRootWithCorePlugins, createTestServers } from '@kbn/core-test-helpers-kbn-server';
import type { TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import type { WorkflowYaml } from '@kbn/workflows';
import {
  getWorkflowPageSavedObjectId,
  partiallyUpdateWorkflowPage,
  WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
} from '../page_saved_object';
import type { WorkflowPageAttributes } from '../page_saved_object';
import { computePageSecretHash } from '../page_secret';
import type { WorkflowPageRef } from '../page_secret';
import { namespaceOf } from '../utils';
import { WorkflowPagesSystemClientImpl } from '../workflow_pages_system_client';

const CREATED_AT = '2026-01-01T00:00:00.000Z';
const definition = { triggers: [{ type: 'page', title: 'Report' }] } as unknown as WorkflowYaml;

/**
 * Runs the page saved object against a real Kibana and Elasticsearch, with ESO, the spaces
 * extension, and core's schema validation, which the in-memory fake store does not have.
 */
describe('workflow-page saved object', () => {
  let esServer: TestElasticsearchUtils;
  let root: ReturnType<typeof createRootWithCorePlugins>;
  let esClient: ElasticsearchClient;
  let internalClient: SavedObjectsClientContract;
  /** Has the spaces extension, which puts writes in one space, like the request-scoped client. */
  let spaceClient: (spaceId: string) => SavedObjectsClientContract;
  let systemClient: WorkflowPagesSystemClientImpl;

  const ref = (workflowId: string, spaceId = 'team'): WorkflowPageRef => ({
    workflowId,
    spaceId,
    pageId: 'default',
  });
  const sync = (workflowId: string, spaceId = 'team') =>
    systemClient.syncWorkflowPages({
      workflowId,
      workflowCreatedAt: CREATED_AT,
      spaceId,
      definition,
      valid: true,
    });
  const getPage = (pageRef: WorkflowPageRef) =>
    internalClient.get<WorkflowPageAttributes>(
      WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
      getWorkflowPageSavedObjectId(pageRef),
      { namespace: namespaceOf(pageRef.spaceId) }
    );
  /** Sets a known secret and an access level, the way a rotation and a publish write them. */
  const publishWithSecret = async (pageRef: WorkflowPageRef, secret: string) => {
    const id = getWorkflowPageSavedObjectId(pageRef);
    const options = { namespace: namespaceOf(pageRef.spaceId), refresh: 'wait_for' as const };
    await internalClient.update<WorkflowPageAttributes>(
      WORKFLOW_PAGE_SAVED_OBJECT_TYPE,
      id,
      {
        workflowId: pageRef.workflowId,
        pageId: pageRef.pageId,
        secret,
        secretHash: computePageSecretHash(pageRef, secret),
      },
      options
    );
    await partiallyUpdateWorkflowPage(
      spaceClient(pageRef.spaceId),
      id,
      { access: { level: 'secret_link' } },
      { refresh: 'wait_for' }
    );
  };

  beforeAll(async () => {
    const { startES } = createTestServers({
      adjustTimeout: (timeout) => jest.setTimeout(timeout),
      settings: { es: { license: 'trial' } },
    });
    esServer = await startES();
    root = createRootWithCorePlugins(
      {
        xpack: { encryptedSavedObjects: { encryptionKey: 'a'.repeat(32) } },
        workflowsManagement: { pages: { enabled: true } },
      },
      { oss: false }
    );
    await root.preboot();
    await root.setup();
    const coreStart = await root.start();
    esClient = coreStart.elasticsearch.client.asInternalUser;
    // Built the way WorkflowPagesService builds it.
    internalClient = coreStart.savedObjects.getUnsafeInternalClient({
      includedHiddenTypes: [WORKFLOW_PAGE_SAVED_OBJECT_TYPE],
      excludedExtensions: [SPACES_EXTENSION_ID],
    });
    const clientWithSpaces = coreStart.savedObjects.getUnsafeInternalClient({
      includedHiddenTypes: [WORKFLOW_PAGE_SAVED_OBJECT_TYPE],
    });
    spaceClient = (spaceId) => clientWithSpaces.asScopedToNamespace(spaceId);
    systemClient = new WorkflowPagesSystemClientImpl({
      logger: loggingSystemMock.createLogger(),
      canEncrypt: true,
      savedObjectsClient: internalClient,
    });
  });

  afterAll(async () => {
    await root?.shutdown();
    await esServer?.stop();
  });

  it('creates a page in a space, with an id that ESO accepts, and keeps it on the next sync', async () => {
    await sync('workflow-create');
    const created = await getPage(ref('workflow-create'));

    await sync('workflow-create');

    expect(created.namespaces).toEqual(['team']);
    expect((await getPage(ref('workflow-create'))).attributes.secretHash).toBe(
      created.attributes.secretHash
    );
  });

  it('stores the secret encrypted', async () => {
    await sync('workflow-encrypted');
    await publishWithSecret(ref('workflow-encrypted'), 'plain-secret');

    const { hits } = await esClient.search<Record<string, { secret?: string }>>({
      index: '.kibana*',
      query: { term: { type: WORKFLOW_PAGE_SAVED_OBJECT_TYPE } },
      size: 100,
    });
    const secrets = hits.hits.map(
      ({ _source }) => _source?.[WORKFLOW_PAGE_SAVED_OBJECT_TYPE]?.secret
    );

    expect(secrets.length).toBeGreaterThan(0);
    expect(secrets).not.toContain('plain-secret');
  });

  it('accepts the secret of a published page and rejects others', async () => {
    const pageRef = ref('workflow-verify');
    await sync('workflow-verify');
    await publishWithSecret(pageRef, 'the-secret');

    await expect(systemClient.verifyPageSecret(pageRef, 'the-secret', CREATED_AT)).resolves.toBe(
      true
    );
    await expect(systemClient.verifyPageSecret(pageRef, 'wrong', CREATED_AT)).resolves.toBe(false);
    await expect(
      systemClient.verifyPageSecret({ ...pageRef, spaceId: 'default' }, 'the-secret', CREATED_AT)
    ).resolves.toBe(false);
  });

  it('moves the page with a workflow that moved to another space', async () => {
    await sync('workflow-move', 'team');

    await sync('workflow-move', 'other-team');

    await expect(getPage(ref('workflow-move', 'team'))).rejects.toHaveProperty(
      'output.statusCode',
      404
    );
    expect((await getPage(ref('workflow-move', 'other-team'))).namespaces).toEqual(['other-team']);
  });

  it('retires the pages of deleted workflows', async () => {
    await sync('workflow-delete');

    await systemClient.retireWorkflowPages({ workflowIds: ['workflow-delete'], spaceId: 'team' });

    await expect(getPage(ref('workflow-delete'))).rejects.toHaveProperty('output.statusCode', 404);
  });

  it('rejects an invalid access level on update', async () => {
    await sync('workflow-schema');

    await expect(
      partiallyUpdateWorkflowPage(
        spaceClient('team'),
        getWorkflowPageSavedObjectId(ref('workflow-schema')),
        { enabled: false }
      )
    ).resolves.toBeUndefined();
    await expect(
      partiallyUpdateWorkflowPage(
        spaceClient('team'),
        getWorkflowPageSavedObjectId(ref('workflow-schema')),
        { access: { level: 'public' } as never }
      )
    ).rejects.toHaveProperty('output.statusCode', 400);
  });
});
