var Promise = require('bluebird');

function replyWithError(e, reply) {
  reply({title: e.toString(), message: e.toString(), stack: e.stack}).code(400);
}

module.exports = function (request, reply) {

  var chainRunner = require('../handlers/chain_runner.js');
  var sheet;
  try {
    sheet = chainRunner.processRequest(request.payload);
  } catch (e) {
    replyWithError(e, reply);
    return;
  }

  return Promise.all(sheet).then(function (sheet) {
    var response = {
      sheet: sheet,
      stats: chainRunner.getStats()
    };
    reply(response);
  }).catch(function (e) {replyWithError(e, reply)});
};