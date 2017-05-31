export default function (kibana) {
  return new kibana.Plugin({
    uiExports: {
      visTypes: [
        'plugins/state_tracker/state_tracker'
      ]
    }
  });
}
