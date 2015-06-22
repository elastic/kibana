var processRequest = require('../parser/runner.js');
var Promise = require('bluebird');
var _ = require('lodash');

module.exports = function (app) {
  app.post('/series', function (req, res) {

    var sheet = processRequest(req.body.sheet);
    var rows = _.map(sheet, function (row) {
      return Promise.all(row);
    });
    Promise.all(rows).then(function (sheet) {
      res.send(sheet);
    }).catch(function (e) {
      res.send(e);
    });

  });
};