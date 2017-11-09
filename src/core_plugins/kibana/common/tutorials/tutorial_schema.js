import Joi from 'joi';
import { PARAM_TYPES } from './param_types';
import { TUTORIAL_CATEGORY } from './tutorial_category';

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
  instructionVariants: Joi.array().items(instructionVariantSchema).required()
});

const paramSchema = Joi.object({
  defaultValue: Joi.required(),
  id: Joi.string().regex(/^[a-zA-Z_]+$/).required(),
  label: Joi.string().required(),
  type: Joi.string().valid(Object.values(PARAM_TYPES)).required()
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
  params: Joi.array().items(paramSchema),
  instructionSets: Joi.array().items(instructionSetSchema).required()
};
