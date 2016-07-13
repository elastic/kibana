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
    'tilemap_url',
    'tilemap_min_zoom',
    'tilemap_max_zoom',
    'tilemap_attribution',
    'tilemap_subdomains'
  ];
  var data = _.pick(config.kibana, keys);
  data.plugins = config.plugins;
  res.json(data);
});

module.exports = router;
