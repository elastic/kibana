export default function (kibana) {
  return new kibana.Plugin({
    uiExports: {
      visTypes: [
        'plugins/terms_vis/terms_vis/terms_vis'
      ]
    }
  });
}
