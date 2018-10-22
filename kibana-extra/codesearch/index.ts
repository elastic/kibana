/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Esqueue } from '@codesearch/esqueue';
import { resolve } from 'path';

import { mappings } from './mappings';
import { LspIndexer, RepositoryIndexInitializer } from './server/indexer';
import { Server } from './server/kibana_types';
import { Log } from './server/log';
import { LspService } from './server/lsp/lsp_service';
import { CloneWorker, DeleteWorker, IndexWorker, UpdateWorker } from './server/queue';
import { fileRoute } from './server/routes/file';
import { lspRoute, symbolByQnameRoute } from './server/routes/lsp';
import { monacoRoute } from './server/routes/monaco';
import { repositoryRoute } from './server/routes/repository';
import {
  documentSearchRoute,
  repositorySearchRoute,
  symbolSearchRoute,
} from './server/routes/search';
import { socketRoute } from './server/routes/socket';
import { userRoute } from './server/routes/user';
import { workspaceRoute } from './server/routes/workspace';
import { IndexScheduler, UpdateScheduler } from './server/scheduler';
import { DocumentSearchClient, RepositorySearchClient, SymbolSearchClient } from './server/search';
import { ServerOptions } from './server/server_options';
import { SocketService } from './server/socket_service';

// tslint:disable-next-line no-default-export
export default (kibana: any) =>
  new kibana.Plugin({
    require: ['elasticsearch'],
    name: 'codesearch',
    publicDir: resolve(__dirname, 'public'),
    uiExports: {
      app: {
        title: 'Code',
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
        queueIndex: Joi.string().default('.codesearch-worker-queue'),
        queueTimeout: Joi.number().default(60 * 60 * 1000), // 1 hour by default
        updateFreqencyMs: Joi.number().default(5 * 60 * 1000), // 5 minutes by default
        indexFrequencyMs: Joi.number().default(24 * 60 * 60 * 1000), // 1 day by default
        lspRequestTimeout: Joi.number().default(5 * 60), // timeout a request over 30s
        repos: Joi.array().default([]),
        maxWorkspace: Joi.number().default(5), // max workspace folder for each language server
        isAdmin: Joi.boolean().default(true), // If we show the admin buttons
        disableScheduler: Joi.boolean().default(true), // Temp option to disable all schedulers.
      }).default();
    },

    init(server: Server, options: any) {
      const queueIndex = server.config().get('codesearch.queueIndex');
      const queueTimeout = server.config().get('codesearch.queueTimeout');
      const adminCluster = server.plugins.elasticsearch.getCluster('admin');
      const dataCluster = server.plugins.elasticsearch.getCluster('data');
      const log = new Log(server);
      const serverOptions = new ServerOptions(options, server.config());

      const socketService = new SocketService(log);

      // Initialize search clients
      const repoSearchClient = new RepositorySearchClient(dataCluster.getClient(), log);
      const documentSearchClient = new DocumentSearchClient(dataCluster.getClient(), log);
      const symbolSearchClient = new SymbolSearchClient(dataCluster.getClient(), log);

      const repository = server.savedObjects.getSavedObjectsRepository(
        adminCluster.callWithInternalUser
      );
      const objectsClient = new server.savedObjects.SavedObjectsClient(repository);

      // Initialize indexers
      const lspService = new LspService('127.0.0.1', server, serverOptions, objectsClient);
      const lspIndexer = new LspIndexer(lspService, serverOptions, adminCluster.getClient(), log);

      // Initialize repository index.
      const repositoryIndexInit = new RepositoryIndexInitializer(adminCluster.getClient(), log);

      // Initialize queue.
      const queue = new Esqueue(queueIndex, {
        client: adminCluster.getClient(),
        timeout: queueTimeout,
        doctype: 'esqueue',
      });
      const indexWorker = new IndexWorker(queue, log, objectsClient, [lspIndexer]).bind();
      const cloneWorker = new CloneWorker(
        queue,
        log,
        objectsClient,
        adminCluster.getClient(),
        indexWorker,
        socketService
      ).bind();
      const deleteWorker = new DeleteWorker(
        queue,
        log,
        objectsClient,
        adminCluster.getClient()
      ).bind();
      const updateWorker = new UpdateWorker(
        queue,
        log,
        objectsClient,
        adminCluster.getClient()
      ).bind();

      // Initialize schedulers.
      const updateScheduler = new UpdateScheduler(
        updateWorker,
        serverOptions,
        objectsClient,
        adminCluster.getClient(),
        log
      );
      const indexScheduler = new IndexScheduler(
        indexWorker,
        serverOptions,
        objectsClient,
        adminCluster.getClient(),
        log
      );
      if (!serverOptions.disableScheduler) {
        updateScheduler.start();
        // Disable index scheduling before having the scheduling state persisted.
        // indexScheduler.start();
      }

      // Add server routes and initialize the plugin here
      repositoryRoute(
        server,
        serverOptions,
        cloneWorker,
        deleteWorker,
        indexWorker,
        repositoryIndexInit
      );
      repositorySearchRoute(server, repoSearchClient);
      documentSearchRoute(server, documentSearchClient);
      symbolSearchRoute(server, symbolSearchClient);
      fileRoute(server, serverOptions);
      workspaceRoute(server, serverOptions, objectsClient);
      monacoRoute(server);
      symbolByQnameRoute(server, symbolSearchClient);
      socketRoute(server, socketService, log);
      userRoute(server, serverOptions);

      lspService.launchServers().then(() => {
        // register lsp route after language server launched
        lspRoute(server, lspService, serverOptions);
      });
    },
  });
