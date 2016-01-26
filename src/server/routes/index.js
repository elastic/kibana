var express = require('express');
var router = express.Router();
var config = require('../config');
var _ = require('lodash');

router.get('/config', function (req, res, next) {
  var keys = [
    'kibana_index',
    'default_app_id',
    'shard_timeout',
    'xsrf_token',
    'index_pattern_placeholder'
  ];
  var data = _.pick(config.kibana, keys);
  data.plugins = config.plugins;
  res.json(data);
});

module.exports = router;
