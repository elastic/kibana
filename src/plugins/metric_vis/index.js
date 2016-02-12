module.exports = function (kibana) {

  return new kibana.Plugin({

    ui: {
      visType: './metric_vis.js'
    }

  });

};
