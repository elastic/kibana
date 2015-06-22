/**
 * Connection that registers a module with angular, using angular's $http service
 * to communicate with ES.
 *
 * @class connections.Angular
 */
module.exports = AngularConnector;

var _ = require('../utils');
var ConnectionAbstract = require('../connection');
var ConnectionFault = require('../errors').ConnectionFault;

function makeAuthHeader(auth) {
  return 'Basic ' + (new Buffer(auth, 'utf8')).toString('base64');
}

function AngularConnector(host, config) {
  ConnectionAbstract.call(this, host, config);
  var self = this;
  self.headerDefaults = {};

  if (self.host.auth) {
    self.headerDefaults.Authorization = makeAuthHeader(self.host.auth);
  }

  config.$injector.invoke(['$http', '$q', function ($http, $q) {
    self.$q = $q;
    self.$http = $http;
  }]);
}
_.inherits(AngularConnector, ConnectionAbstract);

AngularConnector.prototype.request = function (userParams, cb) {
  var abort = this.$q.defer();
  var params = _.cloneDeep(userParams);

  params.headers = _.defaults(params.headers || {}, this.headerDefaults);
  if (params.auth) {
    params.headers.Authorization = makeAuthHeader(params.auth);
  }

  // inform the host not to use the auth, by overriding it in the params
  params.auth = false;

  this.$http({
    method: params.method,
    url: this.host.makeUrl(params),
    data: params.body,
    cache: false,
    headers: this.host.getHeaders(params.headers),
    transformRequest: [],
    transformResponse: [],
    // not actually for timing out, that's handled by the transport
    timeout: abort.promise
  }).then(function (response) {
    cb(null, response.data, response.status, response.headers());
  }, function (err) {
    if (err.status) {
      cb(null, err.data, err.status, err.headers());
    } else {
      cb(new ConnectionFault(err.message));
    }
  });

  return function () {
    abort.resolve();
  };
};