/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';

import { isValidGitUrl } from '../../common/git_url_utils';
import { RepositoryUtils } from '../../common/repository_utils';
import { REPOSITORY_GIT_STATUS_INDEX_TYPE } from '../../mappings';
import { CloneWorkerProgress, Repository } from '../../model';
import { RepositoryIndexInitializer } from '../indexer';
import {
  RepositoryIndexName,
  RepositoryIndexNamePrefix,
  RepositoryReservedField,
  RepositoryTypeName,
} from '../indexer/schema';
import { Server } from '../kibana_types';
import { Log } from '../log';
import { CloneWorker, DeleteWorker, IndexWorker } from '../queue';
import { ServerOptions } from '../server_options';

export function repositoryRoute(
  server: Server,
  options: ServerOptions,
  cloneWorker: CloneWorker,
  deleteWorker: DeleteWorker,
  indexWorker: IndexWorker,
  repoIndexInit: RepositoryIndexInitializer
) {
  // Clone a git repository
  server.route({
    path: '/api/cs/repo',
    method: 'POST',
    async handler(req, reply) {
      const repoUrl: string = req.payload.url;
      const log = new Log(req.server);

      // Reject the request if the url is an invalid git url.
      if (!isValidGitUrl(repoUrl)) {
        reply(Boom.badRequest('Invalid git url.'));
        return;
      }

      const repo = RepositoryUtils.buildRepository(repoUrl);
      const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('data');

      try {
        // Check if the repository already exists
        await callWithRequest(req, 'get', {
          index: RepositoryIndexName(repo.uri),
          type: RepositoryTypeName,
          id: repo.uri,
        });
        const msg = `Repository ${repoUrl} already exists. Skip clone.`;
        log.info(msg);
        reply(msg).code(304); // Not Modified
      } catch (error) {
        log.info(`Repository ${repoUrl} does not exist. Go ahead with clone.`);
        try {
          // Create the index for the repository
          await repoIndexInit.init(repo.uri);

          // Persist to elasticsearch
          await callWithRequest(req, 'create', {
            index: RepositoryIndexName(repo.uri),
            type: RepositoryTypeName,
            id: repo.uri,
            body: JSON.stringify({
              [RepositoryReservedField]: repo,
            }),
          });

          // // Kick off clone job
          const payload = {
            url: repoUrl,
            dataPath: options.repoPath,
          };
          await cloneWorker.enqueueJob(payload, {});
          reply(repo);
        } catch (error) {
          const msg = `Issue repository clone request for ${repoUrl} error: ${error}`;
          log.error(msg);
          reply(Boom.badRequest(msg));
        }
      }
    },
  });

  // Remove a git repository
  server.route({
    path: '/api/cs/repo/{uri*3}',
    method: 'DELETE',
    async handler(req, reply) {
      const repoUri: string = req.params.uri as string;
      const log = new Log(req.server);
      const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('data');
      try {
        // Delete the repository from ES.
        // If object does not exist in ES, an error will be thrown.
        await callWithRequest(req, 'delete', {
          index: RepositoryIndexName(repoUri),
          type: RepositoryTypeName,
          id: repoUri,
        });

        const payload = {
          uri: repoUri,
          dataPath: options.repoPath,
        };
        await deleteWorker.enqueueJob(payload, {});

        reply({});
      } catch (error) {
        const msg = `Issue repository delete request for ${repoUri} error: ${error}`;
        log.error(msg);
        reply(Boom.notFound(msg));
      }
    },
  });

  // Get a git repository
  server.route({
    path: '/api/cs/repo/{uri*3}',
    method: 'GET',
    async handler(req, reply) {
      const repoUri = req.params.uri as string;
      const log = new Log(req.server);
      const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('data');
      try {
        const response = await callWithRequest(req, 'get', {
          index: RepositoryIndexName(repoUri),
          type: RepositoryTypeName,
          id: repoUri,
        });
        const repo: Repository = response._source[RepositoryReservedField];
        reply(repo);
      } catch (error) {
        const msg = `Get repository ${repoUri} error: ${error}`;
        log.error(msg);
        reply(Boom.notFound(msg));
      }
    },
  });

  server.route({
    path: '/api/cs/repoCloneStatus/{uri*3}',
    method: 'GET',
    async handler(req, reply) {
      const repoUri = req.params.uri as string;
      const log = new Log(req.server);
      const objectClient = req.getSavedObjectsClient();

      try {
        const response = await objectClient.get(REPOSITORY_GIT_STATUS_INDEX_TYPE, repoUri);
        const status: CloneWorkerProgress = response.attributes;
        reply(status);
      } catch (error) {
        const msg = `Get repository clone status ${repoUri} error: ${error}`;
        log.error(msg);
        reply(Boom.notFound(msg));
      }
    },
  });

  // Get all git repositories
  server.route({
    path: '/api/cs/repos',
    method: 'GET',
    async handler(req, reply) {
      const log = new Log(req.server);
      const { callWithRequest } = req.server.plugins.elasticsearch.getCluster('data');
      try {
        const response = await callWithRequest(req, 'search', {
          index: `${RepositoryIndexNamePrefix}*`,
          type: RepositoryTypeName,
          body: {
            query: {
              exists: {
                field: RepositoryReservedField,
              },
            },
          },
          from: 0,
          size: 10000,
        });
        const hits: any[] = response.hits.hits;
        const repos: Repository[] = hits.map(hit => {
          const repo: Repository = hit._source[RepositoryReservedField];
          return repo;
        });
        reply(repos);
      } catch (error) {
        const msg = `Get all repositories error: ${error}`;
        log.error(msg);
        reply(Boom.notFound(msg));
      }
    },
  });

  // Issue a repository index task.
  // TODO(mengwei): This is just temprorary API stub to trigger the index job. Eventually in the near
  // future, this route will be removed. The scheduling strategy is still in discussion.
  server.route({
    path: '/api/cs/repo/index/{uri*3}',
    method: 'POST',
    async handler(req, reply) {
      const repoUri = req.params.uri as string;
      const log = new Log(req.server);
      const objectClient = req.getSavedObjectsClient();

      try {
        const response = await objectClient.get(REPOSITORY_GIT_STATUS_INDEX_TYPE, repoUri);
        const cloneStatus: CloneWorkerProgress = response.attributes;

        const payload = {
          uri: repoUri,
          revision: cloneStatus.revision,
          dataPath: options.repoPath,
        };
        await indexWorker.enqueueJob(payload, {});
        reply({});
      } catch (error) {
        const msg = `Index repository ${repoUri} error: ${error}`;
        log.error(msg);
        reply(Boom.notFound(msg));
      }
    },
  });
}
