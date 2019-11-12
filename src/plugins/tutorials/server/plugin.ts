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
import { CoreSetup, Plugin, KibanaRequest } from 'src/core/server';
import {
  TutorialsRegistrySetup,
  TutorialsRegistryStart,
  TutorialsRegistry,
  TutorialSchema,
} from './services';

type TutorialProvider = (context: { [key: string]: unknown }) => TutorialSchema;
type TutorialContextFactory = (
  req: KibanaRequest<
    Readonly<{
      [x: string]: any;
    }>,
    Readonly<{
      [x: string]: any;
    }>,
    Readonly<{
      [x: string]: any;
    }>
  >
) => { [key: string]: unknown };
// following similar signature to the features_catalogue plugin
export class TutorialsPlugin implements Plugin<TutorialsRegistrySetup, TutorialsRegistryStart> {
  private readonly tutorialProviders: TutorialProvider[] = [];
  private readonly scopedTutorialContextFactories: TutorialContextFactory[] = [];

  public async setup(core: CoreSetup) {
    const router = core.http.createRouter();
    router.get(
      { path: '/api/kibana/home/tutorials', validate: false },
      async (context, req, res) => {
        const initialContext = {};
        const scopedContext = this.scopedTutorialContextFactories.reduce(
          (accumulatedContext, contextFactory) => {
            return { ...accumulatedContext, ...contextFactory(req) };
          },
          initialContext
        );

        return res.ok({
          body: this.tutorialProviders.map(tutorialProvider => {
            return tutorialProvider(scopedContext); // needs to be refactored to not take in the server. Does the provider even need the server.
          }),
        });
      }
    );
    return {
      registerTutorial: (specProvider: TutorialProvider) => {
        // registration during setup
        // const emptyContext = {};
        // const { error } = Joi.validate(specProvider(server, emptyContext), tutorialSchema);

        // if (error) {
        //   throw new Error(`Unable to register tutorial spec because its invalid. ${error}`);
        // }

        this.tutorialProviders.push(specProvider);
      },
      addScopedTutorialContextFactory: (scopedTutorialContextFactory: any) => {
        // returned by the setup method of the new plugin, they will do the same thing as now
        if (typeof scopedTutorialContextFactory !== 'function') {
          throw new Error(
            `Unable to add scoped(request) context factory because you did not provide a function`
          );
        }

        this.scopedTutorialContextFactories.push(scopedTutorialContextFactory);
      },
    };
  }

  public async start() {
    return {};
  }
}

/** @public */
export type TutorialsSetup = TutorialsRegistrySetup;

/** @public */
export type TutorialsStart = TutorialsRegistryStart;
