const Joi = require('joi');

const joiOptions = {
  abortEarly: false,
  convert: false
};

const branchesSchema = Joi.array().items(
  Joi.object().keys({
    name: Joi.string().required(),
    checked: Joi.bool()
  }),
  Joi.string()
);

const projectConfig = Joi.object().keys({
  upstream: Joi.string().required(),
  branches: branchesSchema,
  own: Joi.bool(),
  multipleCommits: Joi.bool(),
  multipleBranches: Joi.bool(),
  labels: Joi.array().items(Joi.string())
});

const globalConfig = Joi.object().keys({
  username: Joi.string().required(),
  accessToken: Joi.string().required(),
  own: Joi.bool(),
  multipleCommits: Joi.bool(),
  multipleBranches: Joi.bool(),
  projects: Joi.array().items(projectConfig)
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

module.exports = {
  joiOptions,
  globalConfig,
  projectConfig,
  formatError
};
