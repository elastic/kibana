/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpSetup } from '../../../../core/public';
import { IndexPatternCreationManager, IndexPatternCreationConfig } from './creation';
import { IndexPatternListManager, IndexPatternListConfig } from './list';
import { EnvironmentService } from './environment';
interface SetupDependencies {
  httpClient: HttpSetup;
}

/**
 * Index patterns management service
 *
 * @internal
 */
export class IndexPatternManagementService {
  indexPatternCreationManager: IndexPatternCreationManager;
  indexPatternListConfig: IndexPatternListManager;
  environmentService: EnvironmentService;

  constructor() {
    this.indexPatternCreationManager = new IndexPatternCreationManager();
    this.indexPatternListConfig = new IndexPatternListManager();
    this.environmentService = new EnvironmentService();
  }

  public setup({ httpClient }: SetupDependencies) {
    const creationManagerSetup = this.indexPatternCreationManager.setup(httpClient);
    creationManagerSetup.addCreationConfig(IndexPatternCreationConfig);

    const indexPatternListConfigSetup = this.indexPatternListConfig.setup();
    indexPatternListConfigSetup.addListConfig(IndexPatternListConfig);

    return {
      creation: creationManagerSetup,
      list: indexPatternListConfigSetup,
      environment: this.environmentService.setup(),
    };
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
