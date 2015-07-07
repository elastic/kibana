module.exports = function (kibana) {

  return new kibana.Plugin({

    uiExports: {
      visTypes: [
        'plugins/markdown_vis/markdown_vis'
      ]
    }

  });

};
