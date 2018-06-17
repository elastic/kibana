const Joi = require('joi');

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

const projectConfig = Joi.object().keys({
  upstream: Joi.string().required(),
  branches: branchesSchema.required(),
  labels: Joi.array().items(Joi.string()),
  ...configOptions
});

const globalConfig = Joi.object().keys({
  username: Joi.string().required(),
  accessToken: Joi.string().required(),
  projects: Joi.array(), // deprecated
  ...configOptions
});

const formatError = error => {
  return error.details
    .map(detail => {
      const errorPath =
        detail.path.length > 1 ? `(in ${detail.path.join('.')})` : '';
      return ` - ${detail.message} ${errorPath}`;
    })
    .join('\n');
};

function validate(config, schema) {
  const options = {
    abortEarly: false,
    convert: false
  };
  return Joi.validate(config, schema, options);
}

module.exports = {
  validate,
  globalConfig,
  projectConfig,
  formatError
};
