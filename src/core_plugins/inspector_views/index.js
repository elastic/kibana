export default function (kibana) {
  return new kibana.Plugin({
    uiExports: {
      inspectorViews: [
        'plugins/inspector_views/register_views'
      ]
    }
  });
}
