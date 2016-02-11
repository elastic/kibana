module.exports = function (kibana) {

  return new kibana.Plugin({

    ui: {
      visTypes: [
        'markdown_vis.js'
      ]
    }

  });

};
