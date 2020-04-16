/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { PluginInitializerContext, CoreSetup, CoreStart, Plugin } from 'src/core/public';
import {
  IndexPatternManagementService,
  IndexPatternManagementServiceSetup,
  IndexPatternManagementServiceStart,
} from './service';

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IndexPatternManagementSetupDependencies {}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface IndexPatternManagementStartDependencies {}

export type IndexPatternManagementSetup = IndexPatternManagementServiceSetup;

export type IndexPatternManagementStart = IndexPatternManagementServiceStart;

export class IndexPatternManagementPlugin
  implements
    Plugin<
      IndexPatternManagementSetup,
      IndexPatternManagementStart,
      IndexPatternManagementSetupDependencies,
      IndexPatternManagementStartDependencies
    > {
  private readonly indexPattern = new IndexPatternManagementService();

  constructor(initializerContext: PluginInitializerContext) {}

  public setup(core: CoreSetup) {
    return this.indexPattern.setup({ httpClient: core.http });
  }

  public start(core: CoreStart, plugins: IndexPatternManagementStartDependencies) {
    return this.indexPattern.start();
  }

  public stop() {
    this.indexPattern.stop();
  }
}
