export default kibana => new kibana.Plugin({
  require: ['elasticsearch'],

  uiExports: {
    visTypes: [
      'plugins/vega/vega_type'
    ]
  }
});
