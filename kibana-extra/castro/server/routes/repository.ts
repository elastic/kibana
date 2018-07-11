import * as Hapi from "hapi";

import RepositoryService from '../repositoryService';
import RepositoryUtils from '../../common/repositoryUtils';
import { Repository, NewRepository } from '../../common/models';

export default function (server: Hapi.Server) {

  // Clone a git repository
  server.route({
    path: '/api/castro/repo',
    method: 'POST',
    handler: async function(req: Hapi.Request, reply: any) {
      const repoReq: NewRepository = req.payload;
      const repoUrl: string = repoReq.url;
      // TODO check if repo exists.
      const config = req.server.config();
      const dataPath: string = config.get('castro.dataPath');
      const index = config.get('castro.index');

      const es = req.server.plugins.elasticsearch.getCluster("data");
      const {callWithRequest} = es;

      const repo: Repository = RepositoryUtils.buildRepository(repoUrl);

      // Check if the repository exists.
      callWithRequest(req, 'get', {
        index,
        type: 'repository',
        id: repo.uri
      }).then((response: any) => {
        console.log(`Repository ${repoUrl} already exists. Skip clone.`);
        reply().code(304);  // Not Modified
      }).catch(error => {
        console.log(`Repository ${repoUrl} does not exist. Go ahead with cloning.`);
        // Clone the repository
        const repoService = new RepositoryService(dataPath);
        repoService.clone(repo);

        if (repo) {
          // Persist to elasticsearch
          const es = req.server.plugins.elasticsearch.getCluster("data");
          const {callWithRequest} = es;
          callWithRequest(req, 'create', {
            index,
            type: 'repository',
            id: repo.uri,
            body: JSON.stringify(repo)
          }).then((response: any) => {
            reply(response);
          });
        } else {
          reply('failed to clone the repo.').code(400);
        }
      });
    }
  });

  // Remove a git repository
  server.route({
    path: '/api/castro/repo/{uri*3}',
    method: 'DELETE',
    handler: async function(req: Hapi.Request, reply: any) {
      console.log(`Remove a git repository ${req.params.uri}`);
      const repoUri: string = req.params.uri as string;
      const config = req.server.config();
      const index: string = config.get('castro.index');
      const dataPath: string = config.get('castro.dataPath');

      const es = req.server.plugins.elasticsearch.getCluster("data");
      const {callWithRequest} = es;

      // Check if the repository exists.
      callWithRequest(req, 'get', {
        index,
        type: 'repository',
        id: repoUri
      }).then((response: any) => {
        const repoService = new RepositoryService(dataPath);

        repoService.remove(repoUri);
  
        callWithRequest(req, 'delete', {
          index,
          type: 'repository',
          id: repoUri
        }).then((response: any) => {
          reply(response)
        });
      }).catch(error => {
        console.error(`Repository ${repoUri} does not exist`);
        // TODO: use Boom for better response code handling
        reply().code(404);  // Not Found.
      });
    }
  })

  // Get a git repository
  server.route({
    path: '/api/castro/repo/{uri*3}',
    method: 'GET',
    handler: async function(req: Hapi.Request, reply: any) {
      console.log(`## get a git repository ${req.params.uri}`);
      const repoUri: string = req.params.uri as string;
      const config = req.server.config();
      const index: string = config.get('castro.index');

      const es = req.server.plugins.elasticsearch.getCluster("data");
      const {callWithRequest} = es;
      callWithRequest(req, 'get', {
        index,
        type: 'repository',
        id: repoUri
      }).then((response: any) => {
        const repo: Repository = response._source;
        reply(repo);
      }).catch(error => {
        console.error(`Get repository ${repoUri} error: ${error}`);
        // TODO: use Boom for better response code handling
        reply().code(404);  // Not Found
      });
    }
  })

  // Get all git repositories
  server.route({
    path: '/api/castro/repos',
    method: 'GET',
    handler: async function(req: Hapi.Request, reply: any) {
      const config = req.server.config();
      const index: string = config.get('castro.index');

      const es = req.server.plugins.elasticsearch.getCluster("data");
      const {callWithRequest} = es;
      callWithRequest(req, 'search', {
        index,
        type: 'repository',
        body: {
          query: {
            match_all: {}
          }
        }
      }).then(function (response: any) {
        const hits: any[] = response.hits.hits;
        const repos: Repository[] = hits.map(hit => {
          const repo: Repository = hit._source;
          return repo;
        });
        reply(repos);
      }).catch(error => {
        console.error(`Get all repositories error: ${error}`);
        // TODO: use Boom for better response code handling
        reply().code(404);
      });;
    }
  })
}