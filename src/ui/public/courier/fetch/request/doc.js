import _ from 'lodash';
import CourierFetchStrategyDocProvider from 'ui/courier/fetch/strategy/doc';
import CourierFetchRequestRequestProvider from 'ui/courier/fetch/request/request';
export default function DocRequestProvider(Private) {

  var docStrategy = Private(CourierFetchStrategyDocProvider);
  var AbstractRequest = Private(CourierFetchRequestRequestProvider);

  _.class(DocRequest).inherits(AbstractRequest);
  function DocRequest(source, defer) {
    DocRequest.Super.call(this, source, defer);

    this.type = 'doc';
    this.strategy = docStrategy;
  }

  DocRequest.prototype.canStart = function () {
    var parent = DocRequest.Super.prototype.canStart.call(this);
    if (!parent) return false;

    var version = this.source._version;
    var storedVersion = this.source._getStoredVersion();

    // conditions that equal "fetch This DOC!"
    var unknown = !version && !storedVersion;
    var mismatch = version !== storedVersion;

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
