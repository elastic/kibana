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
import { Worker } from '../queue';
import ServerOptions from '../ServerOptions';

export default function(server: Hapi.Server, options: ServerOptions) {
  // Clone a git repository
  server.route({
    path: '/api/castro/repo',
    method: 'POST',
    async handler(req: Hapi.Request, reply: any) {
      const repoUrl: string = req.payload.url;
      const cloneWorker: Worker = req.server.plugins.castro.cloneWorker;
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
          // Persist to elasticsearch
          await objectClient.create(REPOSITORY_INDEX_TYPE, repo, {
            id: repo.uri,
          });

          const payload = {
            url: repoUrl,
            dataPath: options.repoPath,
          };
          await cloneWorker.enqueueJob(payload, {});
          reply();
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
    path: '/api/castro/repo/{uri*3}',
    method: 'DELETE',
    async handler(req: Hapi.Request, reply: any) {
      const repoUri: string = req.params.uri as string;
      const deleteWorker: Worker = req.server.plugins.castro.deleteWorker;
      const log = new Log(req.server);

      try {
        // Delete the repository from ES.
        // If object does not exist in ES, an error will be thrown.
        await req.getSavedObjectsClient().delete(REPOSITORY_INDEX_TYPE, repoUri);

        const payload = {
          uri: repoUri,
          dataPath: options.repoPath,
        };
        await deleteWorker.enqueueJob(payload, {});

        reply();
      } catch (error) {
        const msg = `Issue repository delete request for ${repoUri} error: ${error}`;
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
          perPage: 10000,
          type: REPOSITORY_INDEX_TYPE,
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
