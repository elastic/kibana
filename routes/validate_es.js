var Promise = require('bluebird');
var elasticsearch = require('elasticsearch');


module.exports = function (request, reply) {
  var config = require('../timelion.json');
  var client = new elasticsearch.Client({
    host: config.es.url
  });

  client.fieldStats({
    index: config.es.default_index,
    fields: config.es.timefield
  }).then(function (resp) {
    reply({
      ok: true,
      field: config.es.timefield,
      min: resp.indices._all.fields[config.es.timefield].min_value,
      max: resp.indices._all.fields[config.es.timefield].max_value
    });
  }).catch(function (resp) {
    reply({
      ok: false,
      resp: resp
    });
  });

};