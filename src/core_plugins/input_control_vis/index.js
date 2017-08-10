export default function (kibana) {
  return new kibana.Plugin({
    uiExports: {
      visTypes: [
        'plugins/input_control_vis/register_vis'
      ]
    }
  });
}
