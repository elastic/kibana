module.exports = function (kibana) {
  return new kibana.Plugin({
    ui: {
      app: {
        title: 'Server Status',
        main: 'statusPage.js',
        hidden: true,
        url: '/status'
      }
    }
  });
};
