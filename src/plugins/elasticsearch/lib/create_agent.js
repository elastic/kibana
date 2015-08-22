var url = require('url');
var fs = require('fs');
var http = require('http');
var https = require('https');
var agentOptions;
module.exports = function (server) {
  var config = server.config();
  var target = url.parse(config.get('elasticsearch.url'));

  var protocol = http;

  if (!agentOptions) {
    agentOptions = {};

    var customCA;
    if (/^https/.test(target.protocol)) {
      protocol = https;
      agentOptions.rejectUnauthorized = config.get('elasticsearch.ssl.verify');

      if (config.get('elasticsearch.ssl.ca')) {
        customCA = fs.readFileSync(config.get('elasticsearch.ssl.ca'), 'utf8');
        agentOptions.ca = [customCA];
      }

      // Add client certificate and key if required by elasticsearch
      if (config.get('elasticsearch.ssl.cert') && config.get('elasticsearch.ssl.key')) {
        agentOptions.crt = fs.readFileSync(config.get('elasticsearch.ssl.cert'), 'utf8');
        agentOptions.key = fs.readFileSync(config.get('elasticsearch.ssl.key'), 'utf8');
      }
    }
  }

  return new protocol.Agent(agentOptions);
};
