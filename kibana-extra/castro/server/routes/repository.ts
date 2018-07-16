import * as Hapi from "hapi";
import Boom from "boom";

import RepositoryService from '../repositoryService';
import RepositoryUtils from '../../common/repositoryUtils';
import { Repository } from '../../model';
import * as Constants from '../../common/constants';

export default function (server: Hapi.Server) {

  // Clone a git repository
  server.route({
    path: '/api/castro/repo',
    method: 'POST',
    handler: async function(req: Hapi.Request, reply: any) {
      const repoUrl: string = req.payload.url;
      const dataPath: string = req.server.config().get('castro.dataPath');
      const objectClient = req.getSavedObjectsClient();
      const repo: Repository = RepositoryUtils.buildRepository(repoUrl);
      try {
        // Check if the repository already exists
        await objectClient.get(Constants.REPOSITORY_INDEX_TYPE, repo.uri);
        const msg = `Repository ${repoUrl} already exists. Skip clone.`;
        console.log(msg);
        reply(msg).code(304);  // Not Modified
      } catch (error) {
        console.log(`Repository ${repoUrl} does not exist. Go ahead with clone.`);
        try {
          // Clone the repository
          // TODO(mengwei): move this to queue handler.
          const repoService = new RepositoryService(dataPath);
          repoService.clone(repo);
          // Persist to elasticsearch
          const res = await objectClient.create(
            Constants.REPOSITORY_INDEX_TYPE,
            repo,
            {
              id: repo.uri
            }
          )
          reply(res);
        } catch (error) {
          const msg = `Failed to clone repository from ${repoUrl}`;
          console.error(msg);
          reply(Boom.badRequest(msg));
        }
      }
    }
  })

  // Remove a git repository
  server.route({
    path: '/api/castro/repo/{uri*3}',
    method: 'DELETE',
    handler: async function(req: Hapi.Request, reply: any) {
      const repoUri: string = req.params.uri as string;
      const dataPath: string = req.server.config().get('castro.dataPath');

      const objectClient = req.getSavedObjectsClient();
      try {
        // Delete the repository from ES.
        // If object does not exist in ES, an error will be thrown.
        await objectClient.delete(Constants.REPOSITORY_INDEX_TYPE, repoUri);

        // Delete the repository data
        const repoService = new RepositoryService(dataPath);
        await repoService.remove(repoUri);
        reply();
      } catch (error) {
        const msg = `Delete repository ${repoUri} error: ${error}`;
        console.error(msg);
        reply(Boom.notFound(msg));
      }
    }
  })

  // Get a git repository
  server.route({
    path: '/api/castro/repo/{uri*3}',
    method: 'GET',
    handler: async function(req: Hapi.Request, reply: any) {
      const repoUri = req.params.uri as string;
      const objectClient = req.getSavedObjectsClient();
      try {
        const response = await objectClient.get(
          Constants.REPOSITORY_INDEX_TYPE,
          repoUri
        )
        const repo: Repository = response.attributes;
        reply(repo);
      } catch (error) {
        const msg = `Get repository ${repoUri} error: ${error}`;
        console.error(msg);
        reply(Boom.notFound(msg));
      };
    }
  })

  // Get all git repositories
  server.route({
    path: '/api/castro/repos',
    method: 'GET',
    handler: async function(req: Hapi.Request, reply: any) {
      const objectClient = req.getSavedObjectsClient();
      try {
        const response = await objectClient.find({
          type: Constants.REPOSITORY_INDEX_TYPE,
          perPage: 10000
        })
        const objects: any[] = response.saved_objects;
        const repos: Repository[] = objects.map(obj => {
          const repo: Repository = obj.attributes;
          return repo;
        });
        reply(repos);
      } catch (error) {
        const msg = `Get all repositories error: ${error}`;
        console.error(msg);
        reply(Boom.notFound(msg));
      }
    }
  })
}