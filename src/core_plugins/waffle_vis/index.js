export default function (kibana) {

  return new kibana.Plugin({
    uiExports: {
      visTypes: ['plugins/waffle_vis/waffle_vis']
    }
  });
}
