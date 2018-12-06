/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Boom from 'boom';
import hapi from 'hapi';
import { InstallManager } from '../lsp/install_manager';
import { LanguageServerDefinition, LanguageServers } from '../lsp/language_servers';
import { LspService } from '../lsp/lsp_service';
import { ServerOptions } from '../server_options';
import { SocketService } from '../socket_service';

export function installRoute(
  server: hapi.Server,
  socketService: SocketService,
  lspService: LspService,
  installManager: InstallManager,
  serverOptions: ServerOptions
) {
  installManager.on(socketService.boradcastInstallProgress);

  const status = (def: LanguageServerDefinition) => ({
    name: def.name,
    status: lspService.languageServerStatus(def.name),
    version: def.version,
    build: def.build,
    languages: def.languages,
    installationType: def.installationType,
  });

  server.route({
    path: '/api/code/install',
    handler() {
      return LanguageServers.map(status);
    },
    method: 'GET',
  });

  server.route({
    path: '/api/code/install/{name}',
    handler(req: hapi.Request) {
      const name = req.params.name;
      const def = LanguageServers.find(d => d.name === name);
      if (def) {
        return status(def);
      } else {
        return Boom.notFound(`language server ${name} not found.`);
      }
    },
    method: 'GET',
  });

  server.route({
    path: '/api/code/install/{name}',
    async handler(req: hapi.Request) {
      const name = req.params.name;
      const def = LanguageServers.find(d => d.name === name);
      if (def) {
        await installManager.install(def);
      } else {
        return Boom.notFound(`language server ${name} not found.`);
      }
    },
    method: 'POST',
  });
}
