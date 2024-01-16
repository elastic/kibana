/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, Plugin } from '@kbn/core/server';
import type { PluginSetup as DataPluginSetup } from '@kbn/data-plugin/server';
import type { LensServerPluginSetup } from '@kbn/lens-plugin/server';
import { getSavedSearchObjectType } from './saved_objects';

/**
 * Saved search SO plugin server Setup contract
 */
export interface SavedSearchSOPublicSetupDependencies {
  data: DataPluginSetup;
  lens: LensServerPluginSetup;
}

export class SavedSearchSOServerPlugin implements Plugin<object, object, object> {
  constructor() {}

  public setup(core: CoreSetup, { data, lens }: SavedSearchSOPublicSetupDependencies) {
    const searchSource = data.search.searchSource;

    const getSearchSourceMigrations = searchSource.getAllMigrations.bind(searchSource);
    core.savedObjects.registerType(
      getSavedSearchObjectType({
        getSearchSourceMigrations,
        lensEmbeddableFactory: lens.lensEmbeddableFactory,
      })
    );

    return {};
  }

  public start() {
    return {};
  }

  public stop() {}
}
