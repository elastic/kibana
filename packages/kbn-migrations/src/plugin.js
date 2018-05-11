const Joi = require('joi');
const { Plugin, Opts } = require('./lib');

const optsSchema = Joi.object().unknown().keys({
  plugins: Opts.pluginArraySchema.required(),
});

module.exports = {
  sanitize(opts) {
    Joi.assert(opts, optsSchema);
    return Plugin.sanitize(opts.plugins);
  },
};
