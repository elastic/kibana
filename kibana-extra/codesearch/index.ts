/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Esqueue } from '@codesearch/esqueue';
import { resolve } from 'path';

import { mappings } from './mappings';
import { LspIndexer, RepositoryIndexer } from './server/indexer';
import { Server } from './server/kibana_types';
import { Log } from './server/log';
import { LspService } from './server/lsp/lsp_service';
import { CloneWorker, DeleteWorker, IndexWorker, UpdateWorker } from './server/queue';
import { exampleRoute } from './server/routes/example';
import { fileRoute } from './server/routes/file';
import { lspRoute } from './server/routes/lsp';
import { monacoRoute } from './server/routes/monaco';
import { repositoryRoute } from './server/routes/repository';
import { ServerOptions } from './server/server_options';
import { UpdateScheduler } from './server/update_scheduler';

// tslint:disable-next-line no-default-export
export default (kibana: any) =>
  new kibana.Plugin({
    require: ['elasticsearch'],
    name: 'codesearch',
    publicDir: resolve(__dirname, 'public'),
    uiExports: {
      app: {
        title: 'Code Search',
        description: 'Code Search Plugin',
        main: 'plugins/codesearch/app',
        styleSheetPath: resolve(__dirname, 'public/styles.scss'),
      },

      hacks: ['plugins/codesearch/hack'],

      mappings,
    },

    config(Joi: any) {
      return Joi.object({
        enabled: Joi.boolean().default(true),
        dataPath: Joi.string().default('/tmp'),
        queueIndex: Joi.string().default('.codesearch-worker-queue'),
        queueTimeout: Joi.number().default(60 * 60 * 1000), // 1 hour by default
        updateFreqencyMs: Joi.number().default(5 * 60 * 1000), // 5 minutes by default.
      }).default();
    },

    init(server: Server, options: any) {
      const queueIndex = server.config().get('codesearch.queueIndex');
      const queueTimeout = server.config().get('codesearch.queueTimeout');
      const adminClient = server.plugins.elasticsearch.getCluster('admin');
      const log = new Log(server);
      const serverOptions = new ServerOptions(options);

      const lspService = new LspService('127.0.0.1', server, serverOptions);
      const lspIndexer = new LspIndexer(lspService, serverOptions, log);
      const repositoryIndexer = new RepositoryIndexer(serverOptions, log);

      const repository = server.savedObjects.getSavedObjectsRepository(
        adminClient.callWithInternalUser
      );
      const objectsClient = new server.savedObjects.SavedObjectsClient(repository);
      const queue = new Esqueue(queueIndex, {
        client: adminClient.getClient(),
        timeout: queueTimeout,
        doctype: 'esqueue',
      });
      const cloneWorker = new CloneWorker(queue, log, objectsClient).bind();
      const deleteWorker = new DeleteWorker(queue, log, objectsClient).bind();
      const updateWorker = new UpdateWorker(queue, log, objectsClient).bind();
      const indexWorker = new IndexWorker(queue, log, objectsClient, [
        lspIndexer,
        repositoryIndexer,
      ]).bind();

      const scheduler = new UpdateScheduler(
        updateWorker,
        serverOptions,
        adminClient.callWithInternalUser
      );
      scheduler.start();

      // Add server routes and initialize the plugin here
      exampleRoute(server);

      repositoryRoute(server, serverOptions, cloneWorker, deleteWorker, indexWorker);
      fileRoute(server, serverOptions);
      monacoRoute(server);

      lspService.launchServers().then(() => {
        // register lsp route after language server launched
        lspRoute(server, lspService);
      });
    },
  });
