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
var logger = require('../lib/logger');
var validateRequest = require('../lib/validateRequest');


// If the target is backed by an SSL and a CA is provided via the config
// then we need to inject the CA
var customCA;
if (/^https/.test(target.protocol) && config.kibana.ca) {
  customCA = fs.readFileSync(config.kibana.ca, 'utf8');
}

// Create the router
var router = module.exports = express.Router();

// We need to capture the raw body before moving on
router.use(function (req, res, next) {
  var chunks = [];
  req.on('data', function (chunk) {
    chunks.push(chunk);
  });
  req.on('end', function () {
    req.rawBody = Buffer.concat(chunks);
    next();
  });
});

router.use(function (req, res, next) {
  try {
    validateRequest(req);
    return next();
  } catch (err) {
    logger.error({ req: req }, err.message || 'Bad Request');
    res.status(403).send(err.message || 'Bad Request');
  }
});

function getPort(req) {
  var matches = req.headers.host.match(/:(\d+)/);
  if (matches) return matches[1];
  return req.connection.pair ? '443' : '80';
}

// Create the proxy middleware
router.use(function (req, res, next) {
  var uri = _.defaults({}, target);

  // Add a slash to the end of the URL so resolve doesn't remove it.
  var path = (/\/$/.test(uri.path)) ? uri.path : uri.path + '/';
  path = url.resolve(path, '.' + req.url);

  var options = {
    url: uri.protocol + '//' + uri.host + path,
    method: req.method,
    headers: _.defaults({ host: target.hostname }, req.headers),
    strictSSL: config.kibana.verify_ssl,
    timeout: config.kibana.request_timeout
  };

  options.headers['x-forward-for'] = req.connection.remoteAddress || req.socket.remoteAddress;
  options.headers['x-forward-port'] = getPort(req);
  options.headers['x-forward-proto'] = req.connection.pair ? 'https' : 'http';

  // If the server has a custom CA we need to add it to the agent options
  if (customCA) {
    options.agentOptions = { ca: [customCA] };
  }

  // Only send the body if it's a PATCH, PUT, or POST
  if (req.rawBody) {
    options.headers['content-length'] = req.rawBody.length;
    options.body = req.rawBody.toString('utf8');
  } else {
    options.headers['content-length'] = 0;
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
    logger.error({ err: err });
    var code = 502;
    var body = { message: 'Bad Gateway' };

    if (err.code === 'ECONNREFUSED') {
      body.message = 'Unable to connect to Elasticsearch';
    }

    if (err.message === 'DEPTH_ZERO_SELF_SIGNED_CERT') {
      body.message = 'SSL handshake with Elasticsearch failed';
    }

    body.err = err.message;
    if (!res.headersSent) res.status(code).json(body);
  });
  esRequest.pipe(res);
});

