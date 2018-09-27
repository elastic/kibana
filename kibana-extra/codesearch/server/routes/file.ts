/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import fileType from 'file-type';
import { Reference } from 'nodegit';
import { ReferenceInfo } from '../../model/commit';
import { commitInfo, GitOperations, referenceInfo } from '../git_operations';
import { Server } from '../kibana_types';
import { ServerOptions } from '../server_options';
import { extractLines } from '../utils/buffer';
import { detectLanguage } from '../utils/detect_language';

export function fileRoute(server: Server, options: ServerOptions) {
  server.route({
    path: '/api/cs/repo/{uri*3}/tree/{ref}/{path*}',
    method: 'GET',
    async handler(req, reply) {
      const fileResolver = new GitOperations(options.repoPath);
      const { uri, path, ref } = req.params;
      const depth = req.query.depth || Number.MAX_SAFE_INTEGER;
      try {
        reply(await fileResolver.fileTree(uri, path, ref, depth));
      } catch (e) {
        if (e.isBoom) {
          reply(e);
        } else {
          reply(Boom.internal(e.message || e.name));
        }
      }
    },
  });

  server.route({
    path: '/api/cs/repo/{uri*3}/blob/{ref}/{path*}',
    method: 'GET',
    async handler(req, reply) {
      const fileResolver = new GitOperations(options.repoPath);
      const { uri, path, ref } = req.params;
      try {
        const blob = await fileResolver.fileContent(uri, path, ref);
        if (blob.isBinary()) {
          const type = fileType(blob.content());
          if (type && type.mime && type.mime.startsWith('image/')) {
            reply(blob.content()).type(type.mime);
          } else {
            // this api will return a empty response with http code 204
            reply('')
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
            reply(lines).type(`text/${lang || 'plain'}`);
          } else {
            const lang = await detectLanguage(path, blob.content());
            reply(blob.content()).type(`text/${lang || 'plain'}`);
          }
        }
      } catch (e) {
        if (e.isBoom) {
          reply(e);
        } else {
          reply(Boom.internal(e.message || e.name));
        }
      }
    },
  });

  server.route({
    path: '/api/cs/repo/{uri*3}/raw/{rev}/{path*}',
    method: 'GET',
    async handler(req, reply) {
      const fileResolver = new GitOperations(options.repoPath);
      const { uri, path, rev } = req.params;
      try {
        const blob = await fileResolver.fileContent(uri, path, rev);
        if (blob.isBinary()) {
          reply(blob.content()).type('application/octet-stream');
        } else {
          reply(blob.content()).type('text/plain');
        }
      } catch (e) {
        if (e.isBoom) {
          reply(e);
        } else {
          reply(Boom.internal(e.message || e.name));
        }
      }
    },
  });
  server.route({
    path: '/api/cs/repo/{uri*3}/history/{ref}',
    method: 'GET',
    async handler(req, reply) {
      const gitOperations = new GitOperations(options.repoPath);
      const { uri, ref } = req.params;
      const count = req.query.count ? parseInt(req.query.count, 10) : 10;
      try {
        const repository = await gitOperations.openRepo(uri);
        const commit = await gitOperations.getCommit(repository, ref);

        const walk = repository.createRevWalk();
        walk.push(commit.id());
        const commits = await walk.getCommits(count);
        reply(commits.map(commitInfo));
      } catch (e) {
        if (e.isBoom) {
          reply(e);
        } else {
          reply(Boom.internal(e.message || e.name));
        }
      }
    },
  });

  server.route({
    path: '/api/cs/repo/{uri*3}/references',
    method: 'GET',
    async handler(req, reply) {
      const gitOperations = new GitOperations(options.repoPath);
      const uri = req.params.uri;
      try {
        const repository = await gitOperations.openRepo(uri);
        const references = await repository.getReferences(Reference.TYPE.OID);
        const results: ReferenceInfo[] = await Promise.all(references.map(referenceInfo));
        reply(results);
      } catch (e) {
        if (e.isBoom) {
          reply(e);
        } else {
          reply(Boom.internal(e.message || e.name));
        }
      }
    },
  });

  server.route({
    path: '/api/cs/repo/{uri*3}/diff/{revision}',
    method: 'GET',
    async handler(req, reply) {
      const gitOperations = new GitOperations(options.repoPath);
      const { uri, revision } = req.params;
      try {
        const diff = await gitOperations.getCommitDiff(uri, revision);
        reply(diff);
      } catch (e) {
        if (e.isBoom) {
          reply(e);
        } else {
          reply(Boom.internal(e.message || e.name));
        }
      }
    },
  });
}
