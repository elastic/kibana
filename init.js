module.exports = function (server, options) {

  server.plugins.rework = {
    kibanaType: 'the_rework_1'
  };

  require('./server/routes/get.js')(server);
  require('./server/routes/save.js')(server);
  require('./server/routes/find.js')(server);
  require('./server/routes/delete.js')(server);

};
