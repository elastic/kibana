/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreStart } from '@kbn/core/server';
import { EmbeddableStart } from '@kbn/embeddable-plugin/server';
import { DashboardStartDeps } from './types';

let coreServices: CoreStart;
let embeddableService: EmbeddableStart;

export function setStartServices(kibanaCore: CoreStart, deps: DashboardStartDeps) {
  coreServices = kibanaCore;
  embeddableService = deps.embeddable;
}

export function getEmbeddableService(): EmbeddableStart {
  if (!embeddableService) {
    throw new Error(
      'Embeddable service is not initialized. Ensure setStartServices is called first.'
    );
  }
  return embeddableService;
}
