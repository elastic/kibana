export default kibana => new kibana.Plugin({
  id: 'vega',
  require: ['elasticsearch'],

  uiExports: {
    visTypes: ['plugins/vega/vega_type'],
    injectDefaultVars: server => ({ vegaConfig: server.config().get('vega') }),
  },

  config: (Joi) => Joi.object({
    enabled: Joi.boolean().default(true),
    enableExternalUrls: Joi.boolean().default(false)
  }).default(),

});
