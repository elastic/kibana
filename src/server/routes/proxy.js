var config = require('../config');
var request = require('request');
var buffer = require('buffer');
var querystring = require('querystring');
var express = require('express');
var _ = require('lodash');
var fs = require('fs');
var url = require('url');
var target = url.parse(config.elasticsearch);
var join = require('path').join;


// If the target is backed by an SSL and a CA is provided via the config
// then we need to inject the CA
var hasCustomCA = false;
if (/^https/.test(target.protocol) && config.kibana.ca) {
  var sslRootCAs = require('ssl-root-cas/latest');
  sslRootCAs.inject();
  var ca = fs.readFileSync(config.kibana.ca, 'utf8');
  var https = require('https');
  https.globalAgent.options.ca.push(ca);
  hasCustomCA = true;
}

// Create the router
var router = module.exports = express.Router();

// We need to capture the raw body before moving on
router.use(function (req, res, next) {
  req.rawBody = '';
  req.setEncoding('utf8');
  req.on('data', function (chunk) {
    req.rawBody += chunk;
  });
  req.on('end', next);
});

// Create the proxy middleware
router.use(function (req, res, next) {

  var uri = _.defaults({}, target);
  var options = {
    url: uri.protocol + '//' + uri.host + req.path,
    method: req.method,
    headers: { },
    strictSSL: config.kibana.verify_ssl,
    timeout: config.kibana.request_timeout
  };

  // If the server has a custom CA we need to add it to the agent options
  if (hasCustomCA) {
    options.agentOptions = { ca: https.globalAgent.options.ca };
  }

  // Only send the body if it's a PATCH, PUT, or POST
  if (_.contains(['PATCH', 'PUT', 'POST'], options.method) && req.rawBody) {
    options.body = req.rawBody;
  }

  // If there is a query string we need to stringify it and send it with
  // the request
  if (Object.keys(req.query).length !== 0) {
    options.url += '?' + querystring.stringify(req.query);
  }

  // Support for handling basic auth
  if (config.kibana.elasticsearch_username && config.kibana.elasticsearch_password) {
    var code = new buffer.Buffer(config.kibana.elasticsearch_username + ':' + config.kibana.elasticsearch_password);
    var auth = 'Basic ' + code.toString('base64');
    options.headers.authorization = auth;
  }

  // To support the elasticsearch_preserve_host feature we need to change the
  // host header to the target host header. I don't quite understand the value
  // of this... but it's a feature we had before so I guess we are keeping it.
  if (config.kibana.elasticsearch_preserve_host) {
    options.headers.host = target.host;
  }

  // Create the request and pipe the response
  var esRequest = request(options);
  esRequest.on('error', function (err) {
    var code = 502;
    var body = { message: 'Bad Gateway' };

    if (err.code === 'ECONNREFUSED') {
      body.message = 'Unable to connect to Elasticsearch';
    }

    if (err.message === 'DEPTH_ZERO_SELF_SIGNED_CERT') {
      body.message = 'SSL handshake with Elasticsearch failed';
    }

    body.err = err.message;
    res.json(body);
  });
  esRequest.pipe(res);
});

