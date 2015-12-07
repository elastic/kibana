module.exports = function (server) {
  //var config = server.config();

  require('./routes/run.js')(server);
  require('./routes/functions.js')(server);
  require('./routes/validate_es.js')(server);

};