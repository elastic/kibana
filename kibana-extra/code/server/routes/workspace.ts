/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EsClient } from '@code/esqueue';
import Boom from 'boom';
import hapi from 'hapi';

import { Log } from '../log';
import { WorkspaceCommand } from '../lsp/workspace_command';
import { WorkspaceHandler } from '../lsp/workspace_handler';
import { ServerOptions } from '../server_options';
import { ServerLoggerFactory } from '../utils/server_logger_factory';

export function workspaceRoute(
  server: hapi.Server,
  serverOptions: ServerOptions,
  client: EsClient
) {
  server.route({
    path: '/api/code/workspace',
    method: 'GET',
    async handler() {
      return serverOptions.repoConfigs;
    },
  });

  server.route({
    path: '/api/code/workspace/{uri*3}/{revision}',
    method: 'POST',
    async handler(req: hapi.Request, reply) {
      const repoUri = req.params.uri as string;
      const revision = req.params.revision as string;
      const repoConfig = serverOptions.repoConfigs[repoUri];
      const force = !!req.query.force;
      if (repoConfig) {
        const log = new Log(server, ['workspace', repoUri]);
        const workspaceHandler = new WorkspaceHandler(
          serverOptions.repoPath,
          serverOptions.workspacePath,
          client,
          new ServerLoggerFactory(server)
        );
        try {
          const { workspaceRepo, workspaceRevision } = await workspaceHandler.openWorkspace(
            repoUri,
            revision
          );
          const workspaceCmd = new WorkspaceCommand(
            repoConfig,
            workspaceRepo.workdir(),
            workspaceRevision,
            log
          );
          workspaceCmd.runInit(force).then(() => {
            return '';
          });
        } catch (e) {
          if (e.isBoom) {
            return e;
          }
        }
      } else {
        return Boom.notFound(`repo config for ${repoUri} not found.`);
      }
    },
  });
}
