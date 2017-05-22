export default function (kibana) {
  return new kibana.Plugin({
    uiExports: {
      visTypes: [
        'plugins/waffle_chart2/waffle_chart2'
      ]
    }
  });
}
