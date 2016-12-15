export default function (kibana) {

  return new kibana.Plugin({

    uiExports: {
      visTypes: [
        'plugins/kbn_vislib_vis_types/kbn_vislib_vis_types'
      ]
    }

  });

}
