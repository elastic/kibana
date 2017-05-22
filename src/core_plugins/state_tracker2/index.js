export default function (kibana) {
  return new kibana.Plugin({
    uiExports: {
      visTypes: [
        'plugins/state_tracker2/state_tracker2'
      ]
    }
  });
}
