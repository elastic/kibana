/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { Server } from '../kibana_types';
import { Log } from '../log';
import { WorkspaceCommand } from '../lsp/workspace_command';
import { WorkspaceHandler } from '../lsp/workspace_handler';
import { ServerOptions } from '../server_options';

export function workspaceRoute(server: Server, serverOptions: ServerOptions, objectsClient: any) {
  server.route({
    path: '/api/cs/workspace',
    method: 'GET',
    async handler(req, reply) {
      const repoConfigs = serverOptions.repoConfigs;
      reply(repoConfigs);
    },
  });

  server.route({
    path: '/api/cs/workspace/{uri*3}/{revision}',
    method: 'POST',
    async handler(req, reply) {
      const repoUri = req.params.uri as string;
      const revision = req.params.revision as string;
      const repoConfig = serverOptions.repoConfigs[repoUri];
      const force = !!req.query.force;
      if (repoConfig) {
        const log = new Log(server, ['workspace', repoUri]);
        const workspaceHandler = new WorkspaceHandler(
          serverOptions.repoPath,
          serverOptions.workspacePath,
          objectsClient,
          log
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
            reply('');
          });
        } catch (e) {
          if (e.isBoom) {
            reply(e);
          }
        }
      } else {
        reply(Boom.notFound(`repo config for ${repoUri} not found.`));
      }
    },
  });
}
