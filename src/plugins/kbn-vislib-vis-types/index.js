module.exports = function (kibana) {

  return new kibana.Plugin({

    exports: {
      visTypes: [
        'plugins/kbn-vislib-vis-types/index'
      ]
    }

  });

};
