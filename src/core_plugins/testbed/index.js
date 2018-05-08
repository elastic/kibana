export default function (kibana) {
  return new kibana.Plugin({
    uiExports: {
      hacks: [ 'plugins/testbed' ]
    }
  });
}
