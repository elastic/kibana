var logger = require('../lib/logger');
var express = require('express');
var router = module.exports = express.Router();
var httpProxy = require('http-proxy');
var config = require('../config');
var url = require('url');
var target = url.parse(config.elasticsearch);
var proxy = new httpProxy.createProxyServer({});
var buffer = require('buffer');

proxy.on('proxyReq', function (proxyReq, req, res, options) {
  // To support the elasticsearch_preserve_host feature we need to change the
  // host header to the target host header.
  if (config.kibana.elasticsearch_preserve_host) {
    proxyReq.setHeader('host', target.host);
  }

  // Support for handling basic auth
  if (config.kibana.elasticsearch_username && config.kibana.elasticsearch_password) {
    var code = new buffer.Buffer(config.kibana.elasticsearch_username + ':' + config.kibana.elasticsearch_password);
    var auth = 'Basic ' + code.toString('base64');
    proxyReq.setHeader('authorization', auth);
  }
});

// Error handling for the proxy
proxy.on('error', function (err, req, res) {
  var code = 502;
  var body = { message: 'Bad Gateway' };

  if (err.code === 'ECONNREFUSED') {
    body.message = 'Unable to connect to Elasticsearch';
  }

  if (err.message === 'DEPTH_ZERO_SELF_SIGNED_CERT') {
    body.message = 'SSL handshake with Elasticsearch failed';
  }

  res.writeHead(502, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
});

router.use(function (req, res, next) {
  var options = {
    target: config.elasticsearch,
    secure: config.kibana.verify_ssl,
    xfwd: true,
    timeout: (config.kibana.request_timeout)
  };
  proxy.web(req, res, options);
});

