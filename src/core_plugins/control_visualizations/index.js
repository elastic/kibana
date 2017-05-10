export default function (kibana) {

  return new kibana.Plugin({
  	require: ['kibana','elasticsearch'],

    uiExports: {
      visTypes: [
        'plugins/control_visualizations/terms_vis/vis.js'
      ]
    }
  });
}