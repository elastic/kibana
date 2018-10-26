/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import fileType from 'file-type';
import hapi from 'hapi';
import { Reference } from 'nodegit';
import { ReferenceInfo } from '../../model/commit';
import { commitInfo, GitOperations, referenceInfo } from '../git_operations';
import { ServerOptions } from '../server_options';
import { extractLines } from '../utils/buffer';
import { detectLanguage } from '../utils/detect_language';

export function fileRoute(server: hapi.Server, options: ServerOptions) {
  server.route({
    path: '/api/cs/repo/{uri*3}/tree/{ref}/{path*}',
    method: 'GET',
    async handler(req) {
      const fileResolver = new GitOperations(options.repoPath);
      const { uri, path, ref } = req.params;
      const depth = req.query.depth || Number.MAX_SAFE_INTEGER;
      try {
        return await fileResolver.fileTree(uri, path, ref, depth);
      } catch (e) {
        if (e.isBoom) {
          return e;
        } else {
          return Boom.internal(e.message || e.name);
        }
      }
    },
  });

  server.route({
    path: '/api/cs/repo/{uri*3}/blob/{ref}/{path*}',
    method: 'GET',
    async handler(req, h: hapi.ResponseToolkit) {
      const fileResolver = new GitOperations(options.repoPath);
      const { uri, path, ref } = req.params;
      try {
        const blob = await fileResolver.fileContent(uri, path, ref);
        if (blob.isBinary()) {
          const type = fileType(blob.content());
          if (type && type.mime && type.mime.startsWith('image/')) {
            const response = h.response(blob.content());
            response.type(type.mime);
            return response;
          } else {
            // this api will return a empty response with http code 204
            return h
              .response('')
              .type('application/octet-stream')
              .code(204);
          }
        } else {
          if (req.query.line) {
            const [from, to] = req.query.line.split(',');
            let fromLine = parseInt(from, 10);
            let toLine = to === undefined ? fromLine + 1 : parseInt(to, 10);
            if (fromLine > toLine) {
              [fromLine, toLine] = [toLine, fromLine];
            }
            const lines = extractLines(blob.content(), fromLine, toLine);
            const lang = await detectLanguage(path, lines);
            return h.response(lines).type(`text/${lang || 'plain'}`);
          } else {
            const lang = await detectLanguage(path, blob.content());
            return h.response(blob.content()).type(`text/${lang || 'plain'}`);
          }
        }
      } catch (e) {
        if (e.isBoom) {
          return e;
        } else {
          return Boom.internal(e.message || e.name);
        }
      }
    },
  });

  server.route({
    path: '/api/cs/repo/{uri*3}/raw/{rev}/{path*}',
    method: 'GET',
    async handler(req, h: hapi.ResponseToolkit) {
      const fileResolver = new GitOperations(options.repoPath);
      const { uri, path, rev } = req.params;
      try {
        const blob = await fileResolver.fileContent(uri, path, rev);
        if (blob.isBinary()) {
          return h.response(blob.content()).type('application/octet-stream');
        } else {
          return h.response(blob.content()).type('text/plain');
        }
      } catch (e) {
        if (e.isBoom) {
          return e;
        } else {
          return Boom.internal(e.message || e.name);
        }
      }
    },
  });
  server.route({
    path: '/api/cs/repo/{uri*3}/history/{ref}',
    method: 'GET',
    async handler(req) {
      const gitOperations = new GitOperations(options.repoPath);
      const { uri, ref } = req.params;
      const count = req.query.count ? parseInt(req.query.count, 10) : 10;
      try {
        const repository = await gitOperations.openRepo(uri);
        const commit = await gitOperations.getCommit(repository, ref);

        const walk = repository.createRevWalk();
        walk.push(commit.id());
        const commits = await walk.getCommits(count);
        return commits.map(commitInfo);
      } catch (e) {
        if (e.isBoom) {
          return e;
        } else {
          return Boom.internal(e.message || e.name);
        }
      }
    },
  });

  server.route({
    path: '/api/cs/repo/{uri*3}/references',
    method: 'GET',
    async handler(req) {
      const gitOperations = new GitOperations(options.repoPath);
      const uri = req.params.uri;
      try {
        const repository = await gitOperations.openRepo(uri);
        const references = await repository.getReferences(Reference.TYPE.OID);
        const results: ReferenceInfo[] = await Promise.all(references.map(referenceInfo));
        return results;
      } catch (e) {
        if (e.isBoom) {
          return e;
        } else {
          return Boom.internal(e.message || e.name);
        }
      }
    },
  });

  server.route({
    path: '/api/cs/repo/{uri*3}/diff/{revision}',
    method: 'GET',
    async handler(req) {
      const gitOperations = new GitOperations(options.repoPath);
      const { uri, revision } = req.params;
      try {
        const diff = await gitOperations.getCommitDiff(uri, revision);
        return diff;
      } catch (e) {
        if (e.isBoom) {
          return e;
        } else {
          return Boom.internal(e.message || e.name);
        }
      }
    },
  });

  server.route({
    path: '/api/cs/repo/{uri*3}/blame/{revision}/{path*}',
    method: 'GET',
    async handler(req) {
      const gitOperations = new GitOperations(options.repoPath);
      const { uri, path, revision } = req.params;
      try {
        const blames = await gitOperations.blame(uri, revision, path);
        return blames;
      } catch (e) {
        if (e.isBoom) {
          return e;
        } else {
          return Boom.internal(e.message || e.name);
        }
      }
    },
  });
}
