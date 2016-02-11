module.exports = function (kibana) {

  return new kibana.Plugin({

    ui: {
      visTypes: [
        'plugins/markdown_vis/markdown_vis'
      ]
    }

  });

};
