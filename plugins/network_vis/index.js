export default function (kibana) {

  return new kibana.Plugin({
    uiExports: {
      visTypes: [
        'plugins/network_vis/network_vis'
      ]
    }
  });

}
