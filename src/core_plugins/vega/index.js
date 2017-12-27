export default kibana => new kibana.Plugin({
  id: 'vega',
  require: ['elasticsearch'],

  uiExports: {
    visTypes: ['plugins/vega/vega_type'],
    injectDefaultVars: server => ({ vegaConfig: server.config().get('vega') }),
  },

  // fixme: other plugins declare 'enabled' param, but it doesn't work by default. It doesn't work without it
  config: Joi => Joi.object({
    enabled: Joi.boolean().default(true),
    enableExternalUrls: Joi.boolean().default(true)
  }).default(),

  // fixme: do we need this code:   isEnabled(config) => config.get('vega.enabled'),

});
