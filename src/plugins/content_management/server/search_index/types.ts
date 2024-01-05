/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { CoreSetup } from '@kbn/core/server';
import type { Client } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/core/server';

export type SearchIndexLogger = Pick<Logger, 'debug' | 'error' | 'info' | 'warn'>;

export type EsClient = Omit<
  Client,
  'connectionPool' | 'serializer' | 'extend' | 'close' | 'diagnostic'
>;

export interface SearchIndexClientFactory {
  /**
   * Creates an Event Stream client.
   *
   * @param core The CoreSetup object provided by the Kibana platform.
   */
  create(core: CoreSetup): SearchIndexClient;
}

/**
 * Represents a storage layer for events.
 */
export interface SearchIndexClient {
  /**
   * Initializes the Search index client. This method is run at the plugin's
   * `setup` phase. It should be used to create any necessary resources.
   */
  initialize(): Promise<void>;

  add: (docs: Array<{ id: string; doc: SearchIndexDoc }>) => Promise<void>;

  update: (docs: Array<{ id: string; doc: Partial<SearchIndexDoc> }>) => Promise<void>;

  delete: (docs: Array<{ id: string }>) => Promise<void>;
}

export interface SearchIndexDoc {
  readonly title: string;
  readonly type: string;
  readonly description?: string;
  readonly owner?: string;
  readonly updatedBy?: string;
  readonly updateTxId: string;
}

export interface EsSearchIndexDoc extends SearchIndexDoc {
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AddDocAction {
  type: 'add';
  id: string;
  doc: SearchIndexDoc;
}

export interface UpdateDocAction {
  type: 'update';
  id: string;
  doc: Partial<SearchIndexDoc>;
}

export interface DeleteDocAction {
  type: 'delete';
  id: string;
}

export type SearchIndexAction = AddDocAction | UpdateDocAction | DeleteDocAction;
