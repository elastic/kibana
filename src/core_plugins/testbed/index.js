export default function (kibana) {
  return new kibana.Plugin({
    uiExports: {
      app: {
        title: 'Testbed',
        main: 'plugins/testbed/testbed',
        hidden: true,
        url: '/testbed'
      }
    }
  });
}
