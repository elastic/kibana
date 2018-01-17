import Joi from 'joi';
import { PARAM_TYPES } from './param_types';
import { TUTORIAL_CATEGORY } from './tutorial_category';

const dashboardSchema = Joi.object({
  title: Joi.string().required(),
  linkLabel: Joi.string().when('isOverview', {
    is: true,
    then: Joi.required(),
  }),
  // Is this an Overview / Entry Point dashboard?
  isOverview: Joi.boolean().required()
});

const artifactsSchema = Joi.object({
  // Fields present in Elasticsearch documents created by this product.
  exportedFields: Joi.object({
    documentationUrl: Joi.string().required()
  }),
  // Kibana dashboards created by this product.
  dashboards: Joi.array().items(dashboardSchema).required()
});

const instructionSchema = Joi.object({
  title: Joi.string(),
  textPre: Joi.string(),
  commands: Joi.array().items(Joi.string()),
  textPost: Joi.string()
});

const instructionVariantSchema = Joi.object({
  id: Joi.string().required(),
  instructions: Joi.array().items(instructionSchema).required()
});

const instructionSetSchema = Joi.object({
  title: Joi.string(),
  // Variants (OSes, languages, etc.) for which tutorial instructions are specified.
  instructionVariants: Joi.array().items(instructionVariantSchema).required()
});

const paramSchema = Joi.object({
  defaultValue: Joi.required(),
  id: Joi.string().regex(/^[a-zA-Z_]+$/).required(),
  label: Joi.string().required(),
  type: Joi.string().valid(Object.values(PARAM_TYPES)).required()
});

const instructionsSchema = Joi.object({
  instructionSets: Joi.array().items(instructionSetSchema).required(),
  params: Joi.array().items(paramSchema)
});

export const tutorialSchema = {
  id: Joi.string().regex(/^[a-zA-Z0-9-]+$/).required(),
  category: Joi.string().valid(Object.values(TUTORIAL_CATEGORY)).required(),
  name: Joi.string().required(),
  shortDescription: Joi.string().required(),
  iconPath: Joi.string(),
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
};
