var Promise = require('bluebird');

module.exports = function (request, reply) {

  var chainRunner = require('../handlers/chain_runner.js');
  var sheet;
  try {
    sheet = chainRunner.processRequest(request.payload);
  } catch (e) {
    reply({error: e.toString()}).code(400);
    return;
  }

  return Promise.all(sheet).then(function (sheet) {
    var response = {
      sheet: sheet,
      stats: chainRunner.getStats()
    };
    reply(response);
  }).catch(function (e) {
    reply({error: e.toString()}).code(400);
  });
};