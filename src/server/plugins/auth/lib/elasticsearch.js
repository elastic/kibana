module.exports = function (server) {
  var status = 'red';
  server.plugins.elasticsearch.status.on('change', function (current) {
    status = current.state;
  });

  var client = server.plugins.elasticsearch.client;

  return function isValid() {
    if (status !== 'green') return false;
    return true;
  };
};