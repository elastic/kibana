module.exports = function (kibana) {

  return new kibana.Plugin({

    ui: {
      visType: './markdown_vis.js'
    }

  });

};
