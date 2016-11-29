import Bluebird from 'bluebird';

export default kibana => new kibana.Plugin({
  config(Joi) {
    return Joi.object().keys({
      enabled: Joi.boolean().default(true),
      delay: Joi.number().required(),
      shared: Joi.string(),
    }).default();
  },

  uiExports: {
    async injectDefaultVars(server, options) {
      await Bluebird.delay(options.delay);
      return { shared: options.shared };
    }
  }
});
