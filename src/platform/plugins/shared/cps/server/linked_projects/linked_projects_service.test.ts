/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { errors } from '@elastic/elasticsearch';

import { LinkedProjectsService } from './linked_projects_service';

describe('LinkedProjectsService', () => {
  let service: LinkedProjectsService;
  let mockLogger: ReturnType<typeof loggingSystemMock.createLogger>;
  let mockElasticsearch: ReturnType<typeof elasticsearchServiceMock.createStart>;
  let mockScopedClient: ReturnType<typeof elasticsearchServiceMock.createScopedClusterClient>;

  const createResponseError = (statusCode: number) =>
    new errors.ResponseError({
      statusCode,
      body: { error: { type: 'security_exception', reason: 'unauthorized' } },
      warnings: [],
      headers: {},
      meta: {} as never,
    });

  beforeEach(() => {
    mockLogger = loggingSystemMock.createLogger();
    mockElasticsearch = elasticsearchServiceMock.createStart();
    mockScopedClient = elasticsearchServiceMock.createScopedClusterClient();
    mockElasticsearch.client.asScoped.mockReturnValue(mockScopedClient);
    service = new LinkedProjectsService(mockLogger, mockElasticsearch);
  });

  it('maps non-empty linked_projects and reports isCpsActive as true', async () => {
    mockScopedClient.asCurrentUser.transport.request.mockResolvedValue({
      origin: {},
      linked_projects: {
        'proj-1': {
          _id: 'id-1',
          _alias: 'alias-1',
          _type: 'security',
          _organisation: 'org-1',
        },
        'proj-2': {
          _id: 'id-2',
          _alias: 'alias-2',
          _type: 'observability',
          _organisation: 'org-2',
        },
      },
    });

    const request = httpServerMock.createKibanaRequest();
    const linkedProjects = await service.getLinkedProjects(request);

    expect(mockScopedClient.asCurrentUser.transport.request).toHaveBeenCalledWith({
      method: 'POST',
      path: '/_project/tags',
      body: { project_routing: '_alias:*' },
    });
    expect(linkedProjects).toEqual([
      { id: 'id-1', alias: 'alias-1', type: 'security', organization: 'org-1' },
      { id: 'id-2', alias: 'alias-2', type: 'observability', organization: 'org-2' },
    ]);
    await expect(service.isCpsActive(request)).resolves.toBe(true);
  });

  it('maps empty linked_projects to [] and reports isCpsActive as false', async () => {
    mockScopedClient.asCurrentUser.transport.request.mockResolvedValue({
      origin: {},
      linked_projects: {},
    });

    const request = httpServerMock.createKibanaRequest();

    await expect(service.getLinkedProjects(request)).resolves.toEqual([]);
    await expect(service.isCpsActive(request)).resolves.toBe(false);
  });

  it('maps absent linked_projects to [] and reports isCpsActive as false', async () => {
    mockScopedClient.asCurrentUser.transport.request.mockResolvedValue({
      origin: {},
    });

    const request = httpServerMock.createKibanaRequest();

    await expect(service.getLinkedProjects(request)).resolves.toEqual([]);
    await expect(service.isCpsActive(request)).resolves.toBe(false);
  });

  it('reports 403 as unresolved rather than inactive, and logs at debug without throwing', async () => {
    mockScopedClient.asCurrentUser.transport.request.mockRejectedValue(createResponseError(403));

    const request = httpServerMock.createKibanaRequest();

    await expect(service.getLinkedProjects(request)).resolves.toBeUndefined();
    await expect(service.isCpsActive(request)).resolves.toBeUndefined();
    expect(mockLogger.debug).toHaveBeenCalledWith(expect.stringContaining('read_project_routing'));
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('reports 401 as unresolved rather than inactive, and logs at debug without throwing', async () => {
    mockScopedClient.asCurrentUser.transport.request.mockRejectedValue(createResponseError(401));

    const request = httpServerMock.createKibanaRequest();

    await expect(service.getLinkedProjects(request)).resolves.toBeUndefined();
    await expect(service.isCpsActive(request)).resolves.toBeUndefined();
    expect(mockLogger.debug).toHaveBeenCalledWith(
      expect.stringContaining('Elasticsearch rejected the credential forwarded')
    );
    expect(mockLogger.warn).not.toHaveBeenCalled();
  });

  it('returns undefined and logs at warn on unexpected errors without throwing', async () => {
    mockScopedClient.asCurrentUser.transport.request.mockRejectedValue(new Error('boom'));

    const request = httpServerMock.createKibanaRequest();

    await expect(service.getLinkedProjects(request)).resolves.toBeUndefined();
    await expect(service.isCpsActive(request)).resolves.toBeUndefined();
    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('boom'));
    expect(mockLogger.debug).not.toHaveBeenCalled();
  });

  it('issues one transport request per request object', async () => {
    mockScopedClient.asCurrentUser.transport.request.mockResolvedValue({
      origin: {},
      linked_projects: {
        'proj-1': {
          _id: 'id-1',
          _alias: 'alias-1',
          _type: 'security',
          _organisation: 'org-1',
        },
      },
    });

    const sameRequest = httpServerMock.createKibanaRequest();
    await service.getLinkedProjects(sameRequest);
    await service.getLinkedProjects(sameRequest);
    await service.isCpsActive(sameRequest);

    expect(mockScopedClient.asCurrentUser.transport.request).toHaveBeenCalledTimes(1);

    const otherRequest = httpServerMock.createKibanaRequest();
    await service.getLinkedProjects(otherRequest);

    expect(mockScopedClient.asCurrentUser.transport.request).toHaveBeenCalledTimes(2);
  });
});
