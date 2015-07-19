var Promise = require('bluebird');

// TODO: Remove when shipping
require('../parser/chain_runner.js');

module.exports = function (app) {
  app.post('/series', function (req, res) {

    var processRequest = require('../parser/chain_runner.js');

    var sheet = processRequest(req.body.sheet);

    Promise.all(sheet).then(function (sheet) {
      res.send(sheet);
    }).catch(function (e) {
      console.log('lol');
      res.send(e);
    });

  });
};