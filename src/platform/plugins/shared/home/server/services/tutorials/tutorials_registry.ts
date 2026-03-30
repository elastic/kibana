/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  CoreSetup,
  CoreStart,
  PluginInitializerContext,
  IStaticAssets,
} from '@kbn/core/server';
import type { CustomIntegrationsPluginSetup } from '@kbn/custom-integrations-plugin/server';
import type { IntegrationCategory } from '@kbn/custom-integrations-plugin/common';
import type {
  TutorialProvider,
  TutorialContextFactory,
  ScopedTutorialContextFactory,
  TutorialContext,
} from './lib/tutorials_registry_types';
import type { TutorialSchema } from './lib/tutorial_schema';
import { tutorialSchema } from './lib/tutorial_schema';
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
            src: tutorial.euiIconType,
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
  private staticAssets!: IStaticAssets;
  private readonly isServerless: boolean;

  constructor(private readonly initContext: PluginInitializerContext) {
    this.isServerless = this.initContext.env.packageInfo.buildFlavor === 'serverless';
  }

  public setup(core: CoreSetup, customIntegrations?: CustomIntegrationsPluginSetup) {
    this.staticAssets = core.http.staticAssets;

    const router = core.http.createRouter();
    router.get(
      {
        path: '/api/kibana/home/tutorials',
        security: {
          authz: {
            enabled: false,
            reason:
              'This route is opted out from authorization, because tutorials are public and ideally should be available to all users.',
          },
        },
        validate: false,
      },
      async (context, req, res) => {
        const initialContext = this.baseTutorialContext;
        const scopedContext = this.scopedTutorialContextFactories.reduce(
          (accumulatedContext, contextFactory) => {
            return { ...accumulatedContext, ...contextFactory(req) };
          },
          initialContext
        );
        const tutorials = this.tutorialProviders.map((tutorialProvider) => {
          return tutorialProvider(scopedContext); // All the tutorialProviders need to be refactored so that they don't need the server.
        });
        return res.ok({
          body: this.isServerless
            ? tutorials.filter(({ omitServerless }) => !omitServerless)
            : tutorials,
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
        if (tutorial.omitServerless && this.isServerless) return;
        registerBeatsTutorialsWithCustomIntegrations(core, customIntegrations, tutorial);
      });
    }
    return {};
  }

  private get baseTutorialContext(): TutorialContext {
    return {
      kibanaBranch: this.initContext.env.packageInfo.branch,
      staticAssets: this.staticAssets,
      isServerless: this.isServerless,
    };
  }
}

/** @public */
export type TutorialsRegistrySetup = ReturnType<TutorialsRegistry['setup']>;

/** @public */
export type TutorialsRegistryStart = ReturnType<TutorialsRegistry['start']>;
