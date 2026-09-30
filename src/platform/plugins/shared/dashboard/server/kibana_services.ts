/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import type { CoreStart, Logger } from '@kbn/core/server';
import type { EmbeddableStart } from '@kbn/embeddable-plugin/server';
import type { SavedObjectTaggingStart } from '@kbn/saved-objects-tagging-plugin/server';
import type { StartDeps } from './plugin';

export let coreServices: CoreStart;
export let embeddableService: EmbeddableStart;
export let taggingService: SavedObjectTaggingStart | undefined;
export let logger: Logger;

export const setKibanaServices = (core: CoreStart, deps: StartDeps, _logger: Logger) => {
  coreServices = core;
  embeddableService = deps.embeddable;
  taggingService = deps.savedObjectsTagging;
  logger = _logger;
};
