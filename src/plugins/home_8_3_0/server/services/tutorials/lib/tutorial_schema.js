"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.tutorialSchema = void 0;

var _configSchema = require("@kbn/config-schema");

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
const dashboardSchema = _configSchema.schema.object({
  // Dashboard saved object id
  id: _configSchema.schema.string(),
  // Is this an Overview / Entry Point dashboard?
  isOverview: _configSchema.schema.boolean(),
  linkLabel: _configSchema.schema.conditional(_configSchema.schema.siblingRef('isOverview'), true, _configSchema.schema.string(), _configSchema.schema.maybe(_configSchema.schema.string()))
});

const artifactsSchema = _configSchema.schema.object({
  // Fields present in Elasticsearch documents created by this product.
  exportedFields: _configSchema.schema.maybe(_configSchema.schema.object({
    documentationUrl: _configSchema.schema.string()
  })),
  // Kibana dashboards created by this product.
  dashboards: _configSchema.schema.arrayOf(dashboardSchema),
  application: _configSchema.schema.maybe(_configSchema.schema.object({
    path: _configSchema.schema.string(),
    label: _configSchema.schema.string()
  }))
});

const statusCheckSchema = _configSchema.schema.object({
  title: _configSchema.schema.maybe(_configSchema.schema.string()),
  text: _configSchema.schema.maybe(_configSchema.schema.string()),
  btnLabel: _configSchema.schema.maybe(_configSchema.schema.string()),
  success: _configSchema.schema.maybe(_configSchema.schema.string()),
  error: _configSchema.schema.maybe(_configSchema.schema.string()),
  esHitsCheck: _configSchema.schema.object({
    index: _configSchema.schema.oneOf([_configSchema.schema.string(), _configSchema.schema.arrayOf(_configSchema.schema.string())]),
    query: _configSchema.schema.recordOf(_configSchema.schema.string(), _configSchema.schema.any())
  })
});

const instructionSchema = _configSchema.schema.object({
  title: _configSchema.schema.maybe(_configSchema.schema.string()),
  textPre: _configSchema.schema.maybe(_configSchema.schema.string()),
  commands: _configSchema.schema.maybe(_configSchema.schema.arrayOf(_configSchema.schema.string())),
  textPost: _configSchema.schema.maybe(_configSchema.schema.string()),
  customComponentName: _configSchema.schema.maybe(_configSchema.schema.string())
});

const instructionVariantSchema = _configSchema.schema.object({
  id: _configSchema.schema.string(),
  instructions: _configSchema.schema.arrayOf(instructionSchema),
  initialSelected: _configSchema.schema.maybe(_configSchema.schema.boolean())
});

const instructionSetSchema = _configSchema.schema.object({
  title: _configSchema.schema.maybe(_configSchema.schema.string()),
  callOut: _configSchema.schema.maybe(_configSchema.schema.object({
    title: _configSchema.schema.string(),
    message: _configSchema.schema.maybe(_configSchema.schema.string()),
    iconType: _configSchema.schema.maybe(_configSchema.schema.string())
  })),
  // Variants (OSes, languages, etc.) for which tutorial instructions are specified.
  instructionVariants: _configSchema.schema.arrayOf(instructionVariantSchema),
  statusCheck: _configSchema.schema.maybe(statusCheckSchema)
});

const idRegExp = /^[a-zA-Z_]+$/;

const paramSchema = _configSchema.schema.object({
  defaultValue: _configSchema.schema.any(),
  id: _configSchema.schema.string({
    validate(value) {
      if (!idRegExp.test(value)) {
        return `Does not satisfy regexp ${idRegExp.toString()}`;
      }
    }

  }),
  label: _configSchema.schema.string(),
  type: _configSchema.schema.oneOf([_configSchema.schema.literal('number'), _configSchema.schema.literal('string')])
});

const instructionsSchema = _configSchema.schema.object({
  instructionSets: _configSchema.schema.arrayOf(instructionSetSchema),
  params: _configSchema.schema.maybe(_configSchema.schema.arrayOf(paramSchema))
});

const tutorialIdRegExp = /^[a-zA-Z0-9-]+$/;

const tutorialSchema = _configSchema.schema.object({
  id: _configSchema.schema.string({
    validate(value) {
      if (!tutorialIdRegExp.test(value)) {
        return `Does not satisfy regexp ${tutorialIdRegExp.toString()}`;
      }
    }

  }),
  category: _configSchema.schema.oneOf([_configSchema.schema.literal('logging'), _configSchema.schema.literal('security'), _configSchema.schema.literal('metrics'), _configSchema.schema.literal('other')]),
  name: _configSchema.schema.string({
    validate(value) {
      if (value === '') {
        return 'is not allowed to be empty';
      }
    }

  }),
  moduleName: _configSchema.schema.maybe(_configSchema.schema.string()),
  isBeta: _configSchema.schema.maybe(_configSchema.schema.boolean()),
  shortDescription: _configSchema.schema.string(),
  // EUI icon type string, one of https://elastic.github.io/eui/#/icons
  euiIconType: _configSchema.schema.maybe(_configSchema.schema.string()),
  longDescription: _configSchema.schema.string(),
  completionTimeMinutes: _configSchema.schema.maybe(_configSchema.schema.number({
    validate(value) {
      if (!Number.isInteger(value)) {
        return 'Expected to be a valid integer number';
      }
    }

  })),
  previewImagePath: _configSchema.schema.maybe(_configSchema.schema.string()),
  // kibana and elastic cluster running on prem
  onPrem: instructionsSchema,
  // kibana and elastic cluster running in elastic's cloud
  elasticCloud: _configSchema.schema.maybe(instructionsSchema),
  // kibana running on prem and elastic cluster running in elastic's cloud
  onPremElasticCloud: _configSchema.schema.maybe(instructionsSchema),
  // Elastic stack artifacts produced by product when it is setup and run.
  artifacts: _configSchema.schema.maybe(artifactsSchema),
  // saved objects used by data module.
  savedObjects: _configSchema.schema.maybe(_configSchema.schema.arrayOf(_configSchema.schema.any())),
  savedObjectsInstallMsg: _configSchema.schema.maybe(_configSchema.schema.string()),
  customStatusCheckName: _configSchema.schema.maybe(_configSchema.schema.string()),
  // Category assignment for the integration browser
  integrationBrowserCategories: _configSchema.schema.maybe(_configSchema.schema.arrayOf(_configSchema.schema.string())),
  // Name of an equivalent package in EPR. e.g. this needs to be explicitly defined if it cannot be derived from a heuristic.
  eprPackageOverlap: _configSchema.schema.maybe(_configSchema.schema.string())
});

exports.tutorialSchema = tutorialSchema;