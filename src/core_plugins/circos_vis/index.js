export default function (kibana) {
  return new kibana.Plugin({
    uiExports: {
      visTypes: [
        'plugins/circos_vis/circos_vis'
      ]
    }
  });
}
