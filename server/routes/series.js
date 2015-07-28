var Promise = require('bluebird');

// TODO: Remove when shipping
require('../parser/chain_runner.js');

module.exports = function (app) {
  app.post('/series', function (req, res) {

    var chainRunner = require('../parser/chain_runner.js');

    var sheet;
    try {
      sheet = chainRunner.processRequest(req.body.sheet);
    } catch (e) {
      res.send({sheet: [e]});
      return;
    }


    return Promise.all(sheet).then(function (sheet) {
      var response = {
        sheet: sheet,
        stats: chainRunner.getStats()
      };
      res.send(response);
    }).catch(function (e) {
      res.send(e);
    });

  });
};