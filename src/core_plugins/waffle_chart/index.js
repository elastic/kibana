export default function (kibana) {
  return new kibana.Plugin({
    uiExports: {
      visTypes: [
        'plugins/waffle_chart/waffle_chart'
      ]
    }
  });
}
