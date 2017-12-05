export default kibana => new kibana.Plugin({
  require: ['elasticsearch'],

  uiExports: {
    visTypes: [
      'plugins/vega_vis/vega_vis_type'
    ]
  }
});
