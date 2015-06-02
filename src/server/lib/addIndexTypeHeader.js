module.exports = function (config, path, options) {
  // Add an header to inform proxies
  // We are talking with the Kibana index, or just with data
  if ((path.indexOf('/' + config.kibana.kibana_index + '/') === 0) ||
    (options.body.indexOf('[{"_index":"' + config.kibana.kibana_index + '"') !== -1)) {
    options.headers['x-kibana-indextype'] = 'kibana';
  }
  else {
    options.headers['x-kibana-indextype'] = 'data';
  }
};
