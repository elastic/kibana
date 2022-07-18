/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart, PluginInitializerContext } from '@kbn/core/server';
import { CustomIntegrationsPluginSetup } from '@kbn/custom-integrations-plugin/server';
import { IntegrationCategory } from '@kbn/custom-integrations-plugin/common';
import {
  TutorialProvider,
  TutorialContextFactory,
  ScopedTutorialContextFactory,
  TutorialContext,
} from './lib/tutorials_registry_types';
import { TutorialSchema, tutorialSchema } from './lib/tutorial_schema';
import { builtInTutorials } from '../../tutorials/register';
import { HOME_APP_BASE_PATH } from '../../../common/constants';

function registerTutorialWithCustomIntegrations(
  customIntegrations: CustomIntegrationsPluginSetup,
  tutorial: TutorialSchema
) {
  customIntegrations.registerCustomIntegration({
    id: tutorial.id,
    title: tutorial.name,
    categories: (tutorial.integrationBrowserCategories ?? []) as IntegrationCategory[],
    uiInternalPath: `${HOME_APP_BASE_PATH}#/tutorial/${tutorial.id}`,
    description: tutorial.shortDescription,
    icons: tutorial.euiIconType
      ? [
          {
            type: 'eui',
            src: tutorial.euiIconType,
          },
        ]
      : [],
    shipper: 'tutorial',
    isBeta: false,
    eprOverlap: tutorial.eprPackageOverlap,
  });
}

function registerBeatsTutorialsWithCustomIntegrations(
  core: CoreStart,
  customIntegrations: CustomIntegrationsPluginSetup,
  tutorial: TutorialSchema
) {
  customIntegrations.registerCustomIntegration({
    id: tutorial.name,
    title: tutorial.name,
    categories: tutorial.integrationBrowserCategories as IntegrationCategory[],
    uiInternalPath: `${HOME_APP_BASE_PATH}#/tutorial/${tutorial.id}`,
    description: tutorial.shortDescription,
    icons: tutorial.euiIconType
      ? [
          {
            type: tutorial.euiIconType.endsWith('svg') ? 'svg' : 'eui',
            src: core.http.basePath.prepend(tutorial.euiIconType),
          },
        ]
      : [],
    shipper: 'beats',
    eprOverlap: tutorial.moduleName,
    isBeta: false,
  });
}

export class TutorialsRegistry {
  private tutorialProviders: TutorialProvider[] = []; // pre-register all the tutorials we know we want in here
  private readonly scopedTutorialContextFactories: TutorialContextFactory[] = [];

  constructor(private readonly initContext: PluginInitializerContext) {}

  public setup(core: CoreSetup, customIntegrations?: CustomIntegrationsPluginSetup) {
    const router = core.http.createRouter();
    router.get(
      { path: '/api/kibana/home/tutorials', validate: false },
      async (context, req, res) => {
        const initialContext = this.baseTutorialContext;
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
        const emptyContext = this.baseTutorialContext;
        let tutorial: TutorialSchema;
        try {
          tutorial = tutorialSchema.validate(specProvider(emptyContext));
        } catch (error) {
          throw new Error(`Unable to register tutorial spec because its invalid. ${error}`);
        }

        if (customIntegrations && tutorial) {
          registerTutorialWithCustomIntegrations(customIntegrations, tutorial);
        }
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

  public start(core: CoreStart, customIntegrations?: CustomIntegrationsPluginSetup) {
    // pre-populate with built in tutorials
    this.tutorialProviders.push(...builtInTutorials);

    if (customIntegrations) {
      builtInTutorials.forEach((provider) => {
        const tutorial = provider(this.baseTutorialContext);
        registerBeatsTutorialsWithCustomIntegrations(core, customIntegrations, tutorial);
      });
    }
    return {};
  }

  private get baseTutorialContext(): TutorialContext {
    return { kibanaBranch: this.initContext.env.packageInfo.branch };
  }
}

/** @public */
export type TutorialsRegistrySetup = ReturnType<TutorialsRegistry['setup']>;

/** @public */
export type TutorialsRegistryStart = ReturnType<TutorialsRegistry['start']>;
