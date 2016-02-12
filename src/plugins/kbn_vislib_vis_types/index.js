module.exports = function (kibana) {

  return new kibana.Plugin({

    ui: {
      visTypes: './kbn_vislib_vis_types'
    }

  });

};
