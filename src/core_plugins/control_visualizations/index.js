export default function (kibana) {

  return new kibana.Plugin({
  	require: ['kibana','elasticsearch'],

    uiExports: {
      visTypes: [
        'plugins/terms/terms_vis/vis'
      ]
    }
  });
}