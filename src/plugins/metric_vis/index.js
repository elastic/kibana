module.exports = function (kibana) {

  return new kibana.Plugin({

    ui: {
      visTypes: [
        'metric_vis.js'
      ]
    }

  });

};
