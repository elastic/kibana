import _ from 'lodash';
import sinon from 'auto-release-sinon';
define(function (require) {

  return function (Private, Promise) {
    var indexPatterns = Private(require('fixtures/stubbed_logstash_index_pattern'));
    var getIndexPatternStub = sinon.stub();
    getIndexPatternStub.returns(Promise.resolve(indexPatterns));

    var courier = {
      indexPatterns: { get: getIndexPatternStub },
      getStub: getIndexPatternStub
    };

    return courier;
  };
});
