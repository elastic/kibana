/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpStart, CoreStart } from '../../../../core/public';
import { IndexPatternCreationManager } from './creation';
import { IndexPatternListManager } from './list';

interface StartDependencies {
  httpClient: HttpStart;
  uiSettings: CoreStart['uiSettings'];
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

  public setup() {}

  public start({ httpClient, uiSettings }: StartDependencies) {
    return {
      creation: this.indexPatternCreationManager.start({ httpClient, uiSettings }),
      list: this.indexPatternListConfig.start({ uiSettings }),
    };
  }

  public stop() {
    // nothing to do here yet.
  }
}

/** @internal */
export type IndexPatternManagementServiceSetup = ReturnType<IndexPatternManagementService['setup']>;
export type IndexPatternManagementServiceStart = ReturnType<IndexPatternManagementService['start']>;
