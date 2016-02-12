module.exports = function (kibana) {

  return new kibana.Plugin({

    ui: {
      visTypes: [
        'plugins/kbn_vislib_vis_types/kbn_vislib_vis_types'
      ]
    }

  });

};
