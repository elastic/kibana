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
import { Plugin, CoreSetup, PluginInitializerContext } from 'src/core/server';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { APMOSSConfig } from './';
import { HomeServerPluginSetup, TutorialProvider } from '../../home/server';
import { tutorialProvider } from './tutorial';

export class APMOSSPlugin implements Plugin<APMOSSPluginSetup> {
  constructor(private readonly initContext: PluginInitializerContext) {
    this.initContext = initContext;
  }
  public async setup(core: CoreSetup, plugins: { home: HomeServerPluginSetup }) {
    const config$ = this.initContext.config.create<APMOSSConfig>();

    const config = await config$.pipe(take(1)).toPromise();

    const apmTutorialProvider = tutorialProvider({
      indexPatternTitle: config.indexPattern,
      indices: {
        errorIndices: config.errorIndices,
        metricsIndices: config.metricsIndices,
        onboardingIndices: config.onboardingIndices,
        sourcemapIndices: config.sourcemapIndices,
        transactionIndices: config.transactionIndices,
      },
    });
    plugins.home.tutorials.registerTutorial(apmTutorialProvider);

    return {
      config$,
      getRegisteredTutorialProvider: () => apmTutorialProvider,
    };
  }

  start() {}
  stop() {}
}

export interface APMOSSPluginSetup {
  config$: Observable<APMOSSConfig>;
  getRegisteredTutorialProvider(): TutorialProvider;
}
