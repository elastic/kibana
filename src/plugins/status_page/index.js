module.exports = function (kibana) {
  return new kibana.Plugin({
    uiExports: {
      app: {
        title: 'Server Status',
        main: 'plugins/status_page/status_page',
        hidden: true,
        url: '/status'
      }
    }
  });
};
