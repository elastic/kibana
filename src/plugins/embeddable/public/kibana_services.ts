/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart } from '@kbn/core/public';
import { EmbeddableStart, EmbeddableStartDependencies } from '.';

export let core: CoreStart;
export let embeddableStart: EmbeddableStart;
export let uiActions: EmbeddableStartDependencies['uiActions'];
export let inspector: EmbeddableStartDependencies['inspector'];
export let savedObjectsManagement: EmbeddableStartDependencies['savedObjectsManagement'];

let notifyPluginServicesReady: () => void;
export const untilPluginStartServicesReady = () =>
  new Promise<void>((resolve) => (notifyPluginServicesReady = resolve));

export const setKibanaServices = (
  kibanaCore: CoreStart,
  selfStart: EmbeddableStart,
  deps: EmbeddableStartDependencies
) => {
  core = kibanaCore;
  uiActions = deps.uiActions;
  inspector = deps.inspector;
  embeddableStart = selfStart;
  savedObjectsManagement = deps.savedObjectsManagement;

  notifyPluginServicesReady();
};
