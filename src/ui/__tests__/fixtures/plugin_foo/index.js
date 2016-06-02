export default kibana => new kibana.Plugin({
  config(Joi) {
    return Joi.object().keys({
      enabled: Joi.boolean().default(true),
      shared: Joi.string()
    }).default();
  },

  uiExports: {
    injectDefaultVars(server, options) {
      return { shared: options.shared };
    }
  }
});
