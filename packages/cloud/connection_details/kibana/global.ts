/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreStart } from '@kbn/core-lifecycle-browser';
import type { CloudStart } from '@kbn/cloud-plugin/public';
import type { SharePluginStart } from '@kbn/share-plugin/public';

export interface ConnectionDetailsGlobalDependencies {
  start: {
    core: {
      analytics: CoreStart['analytics'];
      i18n: CoreStart['i18n'];
      docLinks: CoreStart['docLinks'];
      theme: CoreStart['theme'];
      http: CoreStart['http'];
      application: CoreStart['application'];
      overlays: CoreStart['overlays'];
    };
    plugins: {
      cloud?: CloudStart;
      share?: SharePluginStart;
    };
  };
}

const kDependencies = 'ConnectionDetailsGlobalDependencies';

export const setGlobalDependencies = (dependencies: ConnectionDetailsGlobalDependencies) => {
  (global as any)[kDependencies] = dependencies;
};

export const getGlobalDependencies = (): ConnectionDetailsGlobalDependencies => {
  const dependencies = (global as any)[kDependencies];

  if (dependencies === undefined) {
    throw new Error('ConnectionDetailsGlobalDependencies not set');
  }

  return dependencies as ConnectionDetailsGlobalDependencies;
};
