import Joi, { ValidationError, SchemaLike } from 'joi';
import { HandledError } from './errors';
import { GlobalConfig, ProjectConfigRaw } from '../types/types';

const branchesSchema = Joi.array().items(
  Joi.object().keys({
    name: Joi.string().required(),
    checked: Joi.bool()
  }),
  Joi.string()
);

const configOptions = {
  all: Joi.bool(),
  multiple: Joi.bool(),
  multipleCommits: Joi.bool(),
  multipleBranches: Joi.bool()
};

export const projectConfig = Joi.object().keys({
  upstream: Joi.string().required(),
  branches: branchesSchema.required(),
  labels: Joi.array().items(Joi.string()),
  ...configOptions
});

export const globalConfig = Joi.object().keys({
  username: Joi.string().required(),
  accessToken: Joi.string().required(),
  projects: Joi.array(), // deprecated
  ...configOptions
});

export function formatError(error: ValidationError) {
  return error.details
    .map(detail => {
      const errorPath =
        detail.path.length > 1 ? `(in ${detail.path.join('.')})` : '';
      return ` - ${detail.message} ${errorPath}`;
    })
    .join('\n');
}

export function validate(config: {}, schema: SchemaLike) {
  const options = {
    abortEarly: false,
    convert: false
  };
  return Joi.validate(config, schema, options);
}

export function validateGlobalConfig(config: GlobalConfig, filename: string) {
  const { error } = validate(config, globalConfig);

  if (error) {
    throw new HandledError(
      `The global config file (${filename}) is not valid:\n${formatError(
        error
      )}`
    );
  }

  return config;
}

export function validateProjectConfig(config: {}, filepath: string) {
  const { error } = validate(config, projectConfig);

  if (error) {
    throw new HandledError(
      `The project config file (${filepath}) is not valid:\n${formatError(
        error
      )}`
    );
  }

  return config as ProjectConfigRaw;
}
