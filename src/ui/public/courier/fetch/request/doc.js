define(function (require) {
  return function DocRequestProvider(Private) {
    let _ = require('lodash');

    let docStrategy = Private(require('ui/courier/fetch/strategy/doc'));
    let AbstractRequest = Private(require('ui/courier/fetch/request/request'));

    _.class(DocRequest).inherits(AbstractRequest);
    function DocRequest(source, defer) {
      DocRequest.Super.call(this, source, defer);

      this.type = 'doc';
      this.strategy = docStrategy;
    }

    DocRequest.prototype.canStart = function () {
      let parent = DocRequest.Super.prototype.canStart.call(this);
      if (!parent) return false;

      let version = this.source._version;
      let storedVersion = this.source._getStoredVersion();

      // conditions that equal "fetch This DOC!"
      let unknown = !version && !storedVersion;
      let mismatch = version !== storedVersion;

      return Boolean(mismatch || (unknown && !this.started));
    };

    DocRequest.prototype.handleResponse = function (resp) {
      if (resp.found) {
        this.source._storeVersion(resp._version);
      } else {
        this.source._clearVersion();
      }

      return DocRequest.Super.prototype.handleResponse.call(this, resp);
    };

    return DocRequest;
  };
});
