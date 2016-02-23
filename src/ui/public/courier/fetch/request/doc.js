import _ from 'lodash';

import DocStrategyProvider from '../strategy/doc';
import AbstractRequestProvider from './request';

export default function DocRequestProvider(Private) {

  const docStrategy = Private(DocStrategyProvider);
  const AbstractRequest = Private(AbstractRequestProvider);

  _.class(DocRequest).inherits(AbstractRequest);
  function DocRequest(source, defer) {
    DocRequest.Super.call(this, source, defer);

    this.type = 'doc';
    this.strategy = docStrategy;
  }

  DocRequest.prototype.canStart = function () {
    const parent = DocRequest.Super.prototype.canStart.call(this);
    if (!parent) return false;

    const version = this.source._version;
    const storedVersion = this.source._getStoredVersion();

    // conditions that equal "fetch This DOC!"
    const unknown = !version && !storedVersion;
    const mismatch = version !== storedVersion;

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
