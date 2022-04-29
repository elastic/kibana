"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.HomeServerPlugin = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _services = require("./services");

var _capabilities_provider = require("./capabilities_provider");

var _saved_objects = require("./saved_objects");

var _routes = require("./routes");

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
class HomeServerPlugin {
  constructor(initContext) {
    (0, _defineProperty2.default)(this, "tutorialsRegistry", void 0);
    (0, _defineProperty2.default)(this, "sampleDataRegistry", void 0);
    (0, _defineProperty2.default)(this, "customIntegrations", void 0);
    this.initContext = initContext;
    this.sampleDataRegistry = new _services.SampleDataRegistry(this.initContext);
    this.tutorialsRegistry = new _services.TutorialsRegistry(this.initContext);
  }

  setup(core, plugins) {
    this.customIntegrations = plugins.customIntegrations;
    core.capabilities.registerProvider(_capabilities_provider.capabilitiesProvider);
    core.savedObjects.registerType(_saved_objects.sampleDataTelemetry);
    const router = core.http.createRouter();
    (0, _routes.registerRoutes)(router);
    console.log('RUNNING SETUP!!@#!@')
    return {
      tutorials: { ...this.tutorialsRegistry.setup(core, plugins.customIntegrations)
      },
      sampleData: { ...this.sampleDataRegistry.setup(core, plugins.usageCollection, plugins.customIntegrations)
      }
    };
  }

  start(core) {
    console.log('RUNNING START!!@#!@')
    return {
      tutorials: { ...this.tutorialsRegistry.start(core, this.customIntegrations)
      },
      sampleData: { ...this.sampleDataRegistry.start()
      }
    };
  }
  stop () {
    console.log('RUNNING STOP!!@#!@') 
  }

}
/** @public */


exports.HomeServerPlugin = HomeServerPlugin;