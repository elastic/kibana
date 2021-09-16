/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup } from 'src/core/server';
import {
  TutorialProvider,
  TutorialContextFactory,
  ScopedTutorialContextFactory,
} from './lib/tutorials_registry_types';
import { tutorialSchema } from './lib/tutorial_schema';
import { builtInTutorials } from '../../tutorials/register';
import { CustomIntegrationsPluginSetup } from '../../../../custom_integrations/server';
import { Category, CATEGORY_DISPLAY } from '../../../../custom_integrations/common';

const emptyContext = {};

function registerTutorialWithCustomIntegrations(
  customIntegrations: CustomIntegrationsPluginSetup,
  provider: TutorialProvider
) {
  const tutorial = provider(emptyContext);
  const allowedCategories: Category[] = (tutorial.integrationBrowserCategories
    ? tutorial.integrationBrowserCategories.filter((category) => {
        return CATEGORY_DISPLAY.hasOwnProperty(category);
      })
    : []) as Category[];

  customIntegrations.registerCustomIntegration({
    name: tutorial.id,
    id: tutorial.name,
    title: tutorial.name,
    categories: allowedCategories,
    type: 'ui_link',
    uiInternalPath: `/app/home#/tutorial/${tutorial.id}`,
    description: tutorial.shortDescription,
    euiIconType: tutorial.euiIconType || '',
    eprPackageOverlap: tutorial.eprPackageOverlap,
    shipper: 'tutorial',
  });
}

export class TutorialsRegistry {
  private tutorialProviders: TutorialProvider[] = []; // pre-register all the tutorials we know we want in here
  private readonly scopedTutorialContextFactories: TutorialContextFactory[] = [];

  public setup(core: CoreSetup, customIntegrations: CustomIntegrationsPluginSetup) {
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
          body: this.tutorialProviders.map((tutorialProvider) => {
            return tutorialProvider(scopedContext); // All the tutorialProviders need to be refactored so that they don't need the server.
          }),
        });
      }
    );
    return {
      registerTutorial: (specProvider: TutorialProvider) => {
        try {
          tutorialSchema.validate(specProvider(emptyContext));
        } catch (error) {
          throw new Error(`Unable to register tutorial spec because its invalid. ${error}`);
        }

        registerTutorialWithCustomIntegrations(customIntegrations, specProvider);
        this.tutorialProviders.push(specProvider);
      },

      unregisterTutorial: (specProvider: TutorialProvider) => {
        this.tutorialProviders = this.tutorialProviders.filter(
          (provider) => provider !== specProvider
        );
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

  public start() {
    // pre-populate with built in tutorials
    this.tutorialProviders.push(...builtInTutorials);
    return {};
  }
}

/** @public */
export type TutorialsRegistrySetup = ReturnType<TutorialsRegistry['setup']>;

/** @public */
export type TutorialsRegistryStart = ReturnType<TutorialsRegistry['start']>;
