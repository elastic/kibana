module.exports = function (kibana) {
  return new kibana.Plugin({
    uiExports: {
      app: {
        title: 'Server Status',
        main: 'statusPage.js',
        hidden: true,
        url: '/status'
      }
    }
  });
};
