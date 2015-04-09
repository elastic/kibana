var url = require('url');
var http = require('http');
var fs = require('fs');
var querystring = require('querystring');
var kibana = require('../../');

module.exports = new kibana.Plugin({

  require: ['status'],

  init: function (server, options) {
    var config = server.config();
    var target = url.parse(config.elasticsearch);

    var agentOptions = {
      rejectUnauthorized: config.kibana.verify_ssl
    };

    var customCA;
    if (/^https/.test(target.protocol) && config.kibana.ca) {
      customCA = fs.readFileSync(config.kibana.ca, 'utf8');
      agentOptions.ca = [customCA];
    }

    // Add client certificate and key if required by elasticsearch
    if (/^https/.test(target.protocol) &&
        config.kibana.kibana_elasticsearch_client_crt &&
        config.kibana.kibana_elasticsearch_client_key) {
      agentOptions.crt = fs.readFileSync(config.kibana.kibana_elasticsearch_client_crt, 'utf8');
      agentOptions.key = fs.readFileSync(config.kibana.kibana_elasticsearch_client_key, 'utf8');
    }

    server.route({
      method: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      path: '/elasticsearch/{path*}',
      handler: {
        proxy: {
          mapUri: function (request, callback) {
            var url = config.elasticsearch;
            if (!/\/$/.test(url)) url += '/';
            if (request.params.path) url += request.params.path;
            var query = querystring.stringify(request.query);
            if (query) url += '?' + query;
            callback(null, url);
          },
          passThrough: true,
          agent: new http.Agent(agentOptions)
        }
      }
    });

  }
});
