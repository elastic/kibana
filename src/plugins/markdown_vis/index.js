module.exports = function (kibana) {

  return new kibana.Plugin({

    exports: {
      visTypes: [
        'plugins/markdown_vis/index'
      ]
    }

  });

};
