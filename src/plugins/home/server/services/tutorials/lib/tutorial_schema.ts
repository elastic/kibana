/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import Joi from 'joi';

const PARAM_TYPES = {
  NUMBER: 'number',
  STRING: 'string',
};

const TUTORIAL_CATEGORY = {
  LOGGING: 'logging',
  SECURITY_SOLUTION: 'security solution',
  METRICS: 'metrics',
  OTHER: 'other',
};

const dashboardSchema = Joi.object({
  id: Joi.string().required(), // Dashboard saved object id
  linkLabel: Joi.string().when('isOverview', {
    is: true,
    then: Joi.required(),
  }),
  // Is this an Overview / Entry Point dashboard?
  isOverview: Joi.boolean().required(),
});

const artifactsSchema = Joi.object({
  // Fields present in Elasticsearch documents created by this product.
  exportedFields: Joi.object({
    documentationUrl: Joi.string().required(),
  }),
  // Kibana dashboards created by this product.
  dashboards: Joi.array().items(dashboardSchema).required(),
  application: Joi.object({
    path: Joi.string().required(),
    label: Joi.string().required(),
  }),
});

const statusCheckSchema = Joi.object({
  title: Joi.string(),
  text: Joi.string(),
  btnLabel: Joi.string(),
  success: Joi.string(),
  error: Joi.string(),
  esHitsCheck: Joi.object({
    index: Joi.alternatives().try(Joi.string(), Joi.array().items(Joi.string())).required(),
    query: Joi.object().required(),
  }).required(),
});

const instructionSchema = Joi.object({
  title: Joi.string(),
  textPre: Joi.string(),
  commands: Joi.array().items(Joi.string().allow('')),
  textPost: Joi.string(),
});

const instructionVariantSchema = Joi.object({
  id: Joi.string().required(),
  instructions: Joi.array().items(instructionSchema).required(),
});

const instructionSetSchema = Joi.object({
  title: Joi.string(),
  callOut: Joi.object({
    title: Joi.string().required(),
    message: Joi.string(),
    iconType: Joi.string(),
  }),
  // Variants (OSes, languages, etc.) for which tutorial instructions are specified.
  instructionVariants: Joi.array().items(instructionVariantSchema).required(),
  statusCheck: statusCheckSchema,
});

const paramSchema = Joi.object({
  defaultValue: Joi.required(),
  id: Joi.string()
    .regex(/^[a-zA-Z_]+$/)
    .required(),
  label: Joi.string().required(),
  type: Joi.string().valid(Object.values(PARAM_TYPES)).required(),
});

const instructionsSchema = Joi.object({
  instructionSets: Joi.array().items(instructionSetSchema).required(),
  params: Joi.array().items(paramSchema),
});

export const tutorialSchema = {
  id: Joi.string()
    .regex(/^[a-zA-Z0-9-]+$/)
    .required(),
  category: Joi.string().valid(Object.values(TUTORIAL_CATEGORY)).required(),
  name: Joi.string().required(),
  moduleName: Joi.string(),
  isBeta: Joi.boolean().default(false),
  shortDescription: Joi.string().required(),
  euiIconType: Joi.string(), // EUI icon type string, one of https://elastic.github.io/eui/#/icons
  longDescription: Joi.string().required(),
  completionTimeMinutes: Joi.number().integer(),
  previewImagePath: Joi.string(),

  // kibana and elastic cluster running on prem
  onPrem: instructionsSchema.required(),

  // kibana and elastic cluster running in elastic's cloud
  elasticCloud: instructionsSchema,

  // kibana running on prem and elastic cluster running in elastic's cloud
  onPremElasticCloud: instructionsSchema,

  // Elastic stack artifacts produced by product when it is setup and run.
  artifacts: artifactsSchema,

  // saved objects used by data module.
  savedObjects: Joi.array().items(),
  savedObjectsInstallMsg: Joi.string(),
};
