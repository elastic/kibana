"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.SampleDataRegistry = void 0;

var _defineProperty2 = _interopRequireDefault(require("@babel/runtime/helpers/defineProperty"));

var _sample_dataset_schema = require("./lib/sample_dataset_schema");

var _data_sets = require("./data_sets");

var _routes = require("./routes");

var _usage = require("./usage");

var _uninstall = require("./routes/uninstall");

var _register_with_integrations = require("./lib/register_with_integrations");

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
class SampleDataRegistry {
  constructor(initContext) {
    (0, _defineProperty2.default)(this, "sampleDatasets", []);
    (0, _defineProperty2.default)(this, "appLinksMap", new Map());
    this.initContext = initContext;
  }

  registerSampleDataSet(specProvider) {
    let value;

    try {
      value = _sample_dataset_schema.sampleDataSchema.validate(specProvider());
    } catch (error) {
      throw new Error(`Unable to register sample dataset spec because it's invalid. ${error}`);
    }

    const defaultIndexSavedObjectJson = value.savedObjects.find(savedObjectJson => {
      return savedObjectJson.type === 'index-pattern' && savedObjectJson.id === value.defaultIndex;
    });

    if (!defaultIndexSavedObjectJson) {
      throw new Error(`Unable to register sample dataset spec, defaultIndex: "${value.defaultIndex}" does not exist in savedObjects list.`);
    }

    const dashboardSavedObjectJson = value.savedObjects.find(savedObjectJson => {
      return savedObjectJson.type === 'dashboard' && savedObjectJson.id === value.overviewDashboard;
    });

    if (!dashboardSavedObjectJson) {
      throw new Error(`Unable to register sample dataset spec, overviewDashboard: "${value.overviewDashboard}" does not exist in savedObject list.`);
    }

    this.sampleDatasets.push(value);
  }

  setup(core, usageCollections, customIntegrations) {
    if (usageCollections) {
      const kibanaIndex = core.savedObjects.getKibanaIndex();
      (0, _usage.makeSampleDataUsageCollector)(usageCollections, kibanaIndex);
    }

    const usageTracker = (0, _usage.usage)(core.getStartServices().then(([coreStart]) => coreStart.savedObjects), this.initContext.logger.get('sample_data', 'usage'));
    const router = core.http.createRouter();
    const logger = this.initContext.logger.get('sampleData');
    (0, _routes.createListRoute)(router, this.sampleDatasets, this.appLinksMap, logger);
    (0, _routes.createInstallRoute)(router, this.sampleDatasets, logger, usageTracker);
    (0, _uninstall.createUninstallRoute)(router, this.sampleDatasets, logger, usageTracker);
    this.registerSampleDataSet(_data_sets.flightsSpecProvider);
    this.registerSampleDataSet(_data_sets.logsSpecProvider);
    this.registerSampleDataSet(_data_sets.ecommerceSpecProvider);

    if (customIntegrations && core) {
      (0, _register_with_integrations.registerSampleDatasetWithIntegration)(customIntegrations, core);
    }

    return {
      getSampleDatasets: () => this.sampleDatasets,
      addSavedObjectsToSampleDataset: (id, savedObjects) => {
        const sampleDataset = this.sampleDatasets.find(dataset => {
          return dataset.id === id;
        });

        if (!sampleDataset) {
          throw new Error(`Unable to find sample dataset with id: ${id}`);
        }

        sampleDataset.savedObjects = sampleDataset.savedObjects.concat(savedObjects);
      },
      addAppLinksToSampleDataset: (id, appLinks) => {
        var _this$appLinksMap$get;

        const sampleDataset = this.sampleDatasets.find(dataset => {
          return dataset.id === id;
        });

        if (!sampleDataset) {
          throw new Error(`Unable to find sample dataset with id: ${id}`);
        }

        const existingAppLinks = (_this$appLinksMap$get = this.appLinksMap.get(id)) !== null && _this$appLinksMap$get !== void 0 ? _this$appLinksMap$get : [];
        this.appLinksMap.set(id, [...existingAppLinks, ...appLinks]);
      },
      replacePanelInSampleDatasetDashboard: ({
        sampleDataId,
        dashboardId,
        oldEmbeddableId,
        embeddableId,
        embeddableType,
        embeddableConfig
      }) => {
        const sampleDataset = this.sampleDatasets.find(dataset => {
          return dataset.id === sampleDataId;
        });

        if (!sampleDataset) {
          throw new Error(`Unable to find sample dataset with id: ${sampleDataId}`);
        }

        const dashboard = sampleDataset.savedObjects.find(savedObject => {
          return savedObject.id === dashboardId && savedObject.type === 'dashboard';
        });

        if (!dashboard) {
          throw new Error(`Unable to find dashboard with id: ${dashboardId}`);
        }

        try {
          const reference = dashboard.references.find(referenceItem => {
            return referenceItem.id === oldEmbeddableId;
          });

          if (!reference) {
            throw new Error(`Unable to find reference for embeddable: ${oldEmbeddableId}`);
          }

          reference.type = embeddableType;
          reference.id = embeddableId;
          const referenceName = reference.name.includes(':') ? reference.name.split(':')[1] : reference.name;
          const panels = JSON.parse(dashboard.attributes.panelsJSON);
          const panel = panels.find(panelItem => {
            return panelItem.panelRefName === referenceName;
          });

          if (!panel) {
            throw new Error(`Unable to find panel for reference: ${referenceName}`);
          }

          panel.embeddableConfig = embeddableConfig;
          dashboard.attributes.panelsJSON = JSON.stringify(panels);
        } catch (error) {
          throw new Error(`Unable to replace panel with embeddable ${oldEmbeddableId}, error: ${error}`);
        }
      }
    };
  }

  start() {
    return {};
  }

}
/** @public */


exports.SampleDataRegistry = SampleDataRegistry;