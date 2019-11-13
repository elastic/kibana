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
import Joi from 'joi';
import { CoreSetup, Plugin, KibanaRequest } from 'src/core/server';
import { tutorialSchema } from './tutorial_schema';
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
type ScopedTutorialContextFactory = (...args: any[]) => any;
type AddScopedTutorialContextFactory = (arg0: ScopedTutorialContextFactory) => void;
// following similar signature to the features_catalogue plugin
export class TutorialsPlugin implements Plugin<TutorialsRegistrySetup, TutorialsRegistryStart> {
  private readonly tutorialProviders: TutorialProvider[] = []; // pre-register all the tutorials we know we want in here
  private readonly scopedTutorialContextFactories: TutorialContextFactory[] = [];

  public async setup(core: CoreSetup) {
    /*
    core.http.registerRouterHandlerContext is used to provide a specific value for this request (as the route context)
    This context is available in route handlers

    Otherwise, we return an object containing `registerTutorial` and `addScopedTutorialContextFactory`
    Question: is the way the `addScopedTutorialContextFactory` implemented correct?
    */
    // core.http.registerRouteHandlerContext('getTutorials', (request: any) => {
    //   const initialContext = {};
    //   const scopedContext = this.scopedTutorialContextFactories.reduce(
    //     (accumulatedContext, contextFactory) => {
    //       return { ...accumulatedContext, ...contextFactory(request) };
    //     },
    //     initialContext
    //   );
    //   return this.tutorialProviders.map(tutorialProvider => {
    //     return tutorialProvider(scopedContext); // All the tutorial providers need to be refactored so that they only accept the sscopedContext.
    //   });
    // });

    // const router = core.http.createRouter();
    // router.get(
    //   { path: '/api/kibana/home/NP_tutorials', validate: false },
    //   async (context, req, res) => {
    //     return res.ok({ body: context.getTutorials });
    //   }
    // );

    // The following handler implementation is pretty much the same as using the code from above.
    const router = core.http.createRouter();
    router.get(
      { path: '/api/kibana/home/NP_tutorials', validate: false },
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
            return tutorialProvider(scopedContext); // All the tutorialProviders need to be refactored so that they don't need the server.
          }),
        });
      }
    );
    return {
      registerTutorial: (specProvider: TutorialProvider) => {
        const emptyContext = {};
        const { error } = Joi.validate(specProvider(emptyContext), tutorialSchema);

        if (error) {
          throw new Error(`Unable to register tutorial spec because its invalid. ${error}`);
        }

        this.tutorialProviders.push(specProvider);
      },

      addScopedTutorialContextFactory: (
        scopedTutorialContextFactory: ScopedTutorialContextFactory
      ) => {
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
