"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TutorialsRegistry = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _tutorial_schema = require("./lib/tutorial_schema");

var _register = require("../../tutorials/register");

var _constants = require("../../../common/constants");

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
function registerTutorialWithCustomIntegrations(customIntegrations, tutorial) {
  var _tutorial$integration;

  customIntegrations.registerCustomIntegration({
    id: tutorial.id,
    title: tutorial.name,
    categories: (_tutorial$integration = tutorial.integrationBrowserCategories) !== null && _tutorial$integration !== void 0 ? _tutorial$integration : [],
    uiInternalPath: `${_constants.HOME_APP_BASE_PATH}#/tutorial/${tutorial.id}`,
    description: tutorial.shortDescription,
    icons: tutorial.euiIconType ? [{
      type: 'eui',
      src: tutorial.euiIconType
    }] : [],
    shipper: 'tutorial',
    isBeta: false,
    eprOverlap: tutorial.eprPackageOverlap
  });
}

function registerBeatsTutorialsWithCustomIntegrations(core, customIntegrations, tutorial) {
  customIntegrations.registerCustomIntegration({
    id: tutorial.name,
    title: tutorial.name,
    categories: tutorial.integrationBrowserCategories,
    uiInternalPath: `${_constants.HOME_APP_BASE_PATH}#/tutorial/${tutorial.id}`,
    description: tutorial.shortDescription,
    icons: tutorial.euiIconType ? [{
      type: tutorial.euiIconType.endsWith('svg') ? 'svg' : 'eui',
      src: core.http.basePath.prepend(tutorial.euiIconType)
    }] : [],
    shipper: 'beats',
    eprOverlap: tutorial.moduleName,
    isBeta: false
  });
}

class TutorialsRegistry {
  // pre-register all the tutorials we know we want in here
  constructor(initContext) {
    (0, _defineProperty2.default)(this, "tutorialProviders", []);
    (0, _defineProperty2.default)(this, "scopedTutorialContextFactories", []);
    this.initContext = initContext;
  }

  setup(core, customIntegrations) {
    const router = core.http.createRouter();
    router.get({
      path: '/api/kibana/home/tutorials',
      validate: false
    }, async (context, req, res) => {
      const initialContext = this.baseTutorialContext;
      const scopedContext = this.scopedTutorialContextFactories.reduce((accumulatedContext, contextFactory) => {
        return { ...accumulatedContext,
          ...contextFactory(req)
        };
      }, initialContext);
      return res.ok({
        body: this.tutorialProviders.map(tutorialProvider => {
          return tutorialProvider(scopedContext); // All the tutorialProviders need to be refactored so that they don't need the server.
        })
      });
    });
    return {
      registerTutorial: specProvider => {
        const emptyContext = this.baseTutorialContext;
        let tutorial;

        try {
          tutorial = _tutorial_schema.tutorialSchema.validate(specProvider(emptyContext));
        } catch (error) {
          throw new Error(`Unable to register tutorial spec because its invalid. ${error}`);
        }

        if (customIntegrations && tutorial) {
          registerTutorialWithCustomIntegrations(customIntegrations, tutorial);
        }

        this.tutorialProviders.push(specProvider);
      },
      unregisterTutorial: specProvider => {
        this.tutorialProviders = this.tutorialProviders.filter(provider => provider !== specProvider);
      },
      addScopedTutorialContextFactory: scopedTutorialContextFactory => {
        if (typeof scopedTutorialContextFactory !== 'function') {
          throw new Error(`Unable to add scoped(request) context factory because you did not provide a function`);
        }

        this.scopedTutorialContextFactories.push(scopedTutorialContextFactory);
      }
    };
  }

  start(core, customIntegrations) {
    // pre-populate with built in tutorials
    this.tutorialProviders.push(..._register.builtInTutorials);

    if (customIntegrations) {
      _register.builtInTutorials.forEach(provider => {
        const tutorial = provider(this.baseTutorialContext);
        registerBeatsTutorialsWithCustomIntegrations(core, customIntegrations, tutorial);
      });
    }

    return {};
  }

  get baseTutorialContext() {
    return {
      kibanaBranch: this.initContext.env.packageInfo.branch
    };
  }

}
/** @public */


exports.TutorialsRegistry = TutorialsRegistry;