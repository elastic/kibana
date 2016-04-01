define(function (require) {
  let _ = require('lodash');
  let sinon = require('auto-release-sinon');

  return function (Private, Promise) {
    let indexPatterns = Private(require('fixtures/stubbed_logstash_index_pattern'));
    let getIndexPatternStub = sinon.stub();
    getIndexPatternStub.returns(Promise.resolve(indexPatterns));

    let courier = {
      indexPatterns: { get: getIndexPatternStub },
      getStub: getIndexPatternStub
    };

    return courier;
  };
});
