module.exports = function (server) {
  //var config = server.config();

  require('./server/routes/run.js')(server);
  require('./server/routes/functions.js')(server);
  require('./server/routes/validate_es.js')(server);

};
