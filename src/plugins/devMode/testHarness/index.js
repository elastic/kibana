module.exports = function (server) {
  return function (kbnServer) {
    require('./render')(server, kbnServer);
    require('./routes')(server, kbnServer);
  };
};
