export default kibana => new kibana.Plugin({
  id: 'vega',
  require: ['elasticsearch'],

  uiExports: {
    visTypes: [
      'plugins/vega/vega_type'
    ],
    // fixme: For some reason, injectVars() is never called
    // fixme: once fixed, remove it from src/core_plugins/kibana/inject_vars.js
    // app: {
    //   injectVars: (server) => ({ vegaConfig: server.config().get('vega') })
    // }
  },

  // todo: does this plugin need this?   isEnabled(config) => config.get('vega.enabled'),

  config: function (Joi) {
    return Joi.object({
      // todo: other plugins declare 'enabled' param, but it doesn't work by default. It doesn't work without it
      enabled: Joi.boolean().default(true),
      enableExternalUrls: Joi.boolean().default(true)
    }).default();
  },

});
