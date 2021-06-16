/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpSetup, CoreSetup } from '../../../../core/public';
import {
  IndexPatternCreationManager,
  IndexPatternCreationConfig,
  RollupIndexPatternCreationConfig,
} from './creation';
import {
  IndexPatternListManager,
  IndexPatternListConfig,
  RollupIndexPatternListConfig,
} from './list';

import { CONFIG_ROLLUPS } from '../constants';
interface SetupDependencies {
  httpClient: HttpSetup;
  uiSettings: CoreSetup['uiSettings'];
}

/**
 * Index patterns management service
 *
 * @internal
 */
export class IndexPatternManagementService {
  indexPatternCreationManager: IndexPatternCreationManager;
  indexPatternListConfig: IndexPatternListManager;

  constructor() {
    this.indexPatternCreationManager = new IndexPatternCreationManager();
    this.indexPatternListConfig = new IndexPatternListManager();
  }

  public setup({ httpClient, uiSettings }: SetupDependencies) {
    const creationManagerSetup = this.indexPatternCreationManager.setup(httpClient);
    creationManagerSetup.addCreationConfig(IndexPatternCreationConfig);

    const indexPatternListConfigSetup = this.indexPatternListConfig.setup();
    indexPatternListConfigSetup.addListConfig(IndexPatternListConfig);

    if (uiSettings.get(CONFIG_ROLLUPS, false)) {
      creationManagerSetup.addCreationConfig(RollupIndexPatternCreationConfig);
      indexPatternListConfigSetup.addListConfig(RollupIndexPatternListConfig);
    }
  }

  public start() {
    return {
      creation: this.indexPatternCreationManager.start(),
      list: this.indexPatternListConfig.start(),
    };
  }

  public stop() {
    // nothing to do here yet.
  }
}

/** @internal */
export type IndexPatternManagementServiceSetup = ReturnType<IndexPatternManagementService['setup']>;
export type IndexPatternManagementServiceStart = ReturnType<IndexPatternManagementService['start']>;
