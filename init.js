module.exports = function (server) {
  require('./handlers/chain_runner.js');
  //var config = server.config();
  server.route({
    method: 'POST',
    path: '/timelion/sheet',
    handler: require('./routes/sheet.js')
  });
};