/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import * as Hapi from 'hapi';

import RepositoryUtils from '../../common/repositoryUtils';
import { REPOSITORY_INDEX_TYPE } from '../../mappings';
import { Repository } from '../../model';
import { Log } from '../log';
import RepositoryService from '../repositoryService';

export default function(server: Hapi.Server) {
  // Clone a git repository
  server.route({
    path: '/api/castro/repo',
    method: 'POST',
    async handler(req: Hapi.Request, reply: any) {
      const repoUrl: string = req.payload.url;
      const dataPath: string = req.server.config().get('castro.dataPath');
      const objectClient = req.getSavedObjectsClient();
      const log = new Log(req.server);

      const repo: Repository = RepositoryUtils.buildRepository(repoUrl);
      try {
        // Check if the repository already exists
        await objectClient.get(REPOSITORY_INDEX_TYPE, repo.uri);
        const msg = `Repository ${repoUrl} already exists. Skip clone.`;
        log.info(msg);
        reply(msg).code(304); // Not Modified
      } catch (error) {
        log.info(`Repository ${repoUrl} does not exist. Go ahead with clone.`);
        try {
          // Clone the repository
          // TODO(mengwei): move this to queue handler.
          const repoService = new RepositoryService(dataPath, log);
          repoService.clone(repo);
          // Persist to elasticsearch
          const res = await objectClient.create(REPOSITORY_INDEX_TYPE, repo, {
            id: repo.uri,
          });
          reply(res);
        } catch (error) {
          const msg = `Failed to clone repository from ${repoUrl}`;
          log.error(msg);
          reply(Boom.badRequest(msg));
        }
      }
    },
  });

  // Remove a git repository
  server.route({
    path: '/api/castro/repo/{uri*3}',
    method: 'DELETE',
    async handler(req: Hapi.Request, reply: any) {
      const repoUri: string = req.params.uri as string;
      const dataPath: string = req.server.config().get('castro.dataPath');
      const log = new Log(req.server);

      const objectClient = req.getSavedObjectsClient();
      try {
        // Delete the repository from ES.
        // If object does not exist in ES, an error will be thrown.
        await objectClient.delete(REPOSITORY_INDEX_TYPE, repoUri);

        // Delete the repository data
        const repoService = new RepositoryService(dataPath, log);
        await repoService.remove(repoUri);
        reply();
      } catch (error) {
        const msg = `Delete repository ${repoUri} error: ${error}`;
        log.error(msg);
        reply(Boom.notFound(msg));
      }
    },
  });

  // Get a git repository
  server.route({
    path: '/api/castro/repo/{uri*3}',
    method: 'GET',
    async handler(req: Hapi.Request, reply: any) {
      const repoUri = req.params.uri as string;
      const objectClient = req.getSavedObjectsClient();
      const log = new Log(req.server);

      try {
        const response = await objectClient.get(REPOSITORY_INDEX_TYPE, repoUri);
        const repo: Repository = response.attributes;
        reply(repo);
      } catch (error) {
        const msg = `Get repository ${repoUri} error: ${error}`;
        log.error(msg);
        reply(Boom.notFound(msg));
      }
    },
  });

  // Get all git repositories
  server.route({
    path: '/api/castro/repos',
    method: 'GET',
    async handler(req: Hapi.Request, reply: any) {
      const objectClient = req.getSavedObjectsClient();
      const log = new Log(req.server);

      try {
        const response = await objectClient.find({
          type: REPOSITORY_INDEX_TYPE,
          perPage: 10000,
        });
        const objects: any[] = response.saved_objects;
        const repos: Repository[] = objects.map(obj => {
          const repo: Repository = obj.attributes;
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
}
