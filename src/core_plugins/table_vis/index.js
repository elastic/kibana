export default function (kibana) {

  return new kibana.Plugin({
    uiExports: {
      visTypes: [
        'plugins/table_vis/table_vis'
      ]
    }
  });

}
