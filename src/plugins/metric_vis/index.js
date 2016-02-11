module.exports = function (kibana) {

  return new kibana.Plugin({

    uiExports: {
      visTypes: [
        'metric_vis.js'
      ]
    }

  });

};
