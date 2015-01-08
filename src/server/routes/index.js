var express = require('express');
var router = express.Router();
var config = require('../config');
var _ = require('lodash');

router.get('/config', function (req, res, next) {
  var excludedKeys = [
    'port',
    'host',
    'verify_ssl',
    'request_timeout',
    'elasticsearch_url',
    'elasticsearch_username',
    'elasticsearch_password',
    'elasticsearch_preserve_host'
  ];
  var data = _.omit(config.kibana, excludedKeys);
  data.plugins = config.plugins;
  res.json(data);
});

module.exports = router;
