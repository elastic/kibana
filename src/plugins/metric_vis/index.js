export default function (kibana) {

  return new kibana.Plugin({

    uiExports: {
      visTypes: [
        'plugins/metric_vis/metric_vis'
      ]
    }

  });

};
