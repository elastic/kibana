define(function (require) {
  return function DocRequestProvider(Private) {
    var _ = require('lodash');

    var strategy = Private(require('components/courier/fetch/strategy/doc'));
    var AbstractRequest = Private(require('components/courier/fetch/request/request'));

    _(DocRequest).inherits(AbstractRequest);
    function DocRequest(source, defer) {
      DocRequest.Super.call(this, source, defer);
    }

    DocRequest.prototype.type = 'doc';
    DocRequest.prototype.strategy = strategy;

    DocRequest.prototype.isReady = function () {
      var parent = DocRequest.Super.prototype.isReady.call(this);
      if (!parent) return false;

      // _getStoredVersion updates the internal
      // cache returned by _getVersion, so _getVersion
      // must be called first
      var version = this.source._getVersion();
      var storedVersion = this.source._getStoredVersion();

      // conditions that equal "fetch This DOC!"
      var unknownVersion = !version && !storedVersion;
      var versionMismatch = version !== storedVersion;
      var localVersionCleared = version && !storedVersion;

      if (unknownVersion || versionMismatch || localVersionCleared) return true;
    };

    DocRequest.prototype.resolve = function (resp) {
      if (resp.found) {
        this.source._storeVersion(resp._version);
      } else {
        this.source._clearVersion();
      }

      return DocRequest.Super.prototype.resolve.call(this, resp);
    };

    return DocRequest;
  };
});