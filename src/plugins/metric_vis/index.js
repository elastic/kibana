module.exports = function (kibana) {

  return new kibana.Plugin({

    exports: {
      visTypes: [
        'plugins/metric-vis/index'
      ]
    }

  });

};
