module.exports = kibana => new kibana.Plugin({
  uiExports: {
    hacks: [
      'plugins/test_plugin/hack.js'
    ]
  }
});