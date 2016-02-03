import _ from 'lodash';
import sinon from 'auto-release-sinon';
import FixturesStubbedLogstashIndexPatternProvider from 'fixtures/stubbed_logstash_index_pattern';

export default function (Private, Promise) {
  var indexPatterns = Private(FixturesStubbedLogstashIndexPatternProvider);
  var getIndexPatternStub = sinon.stub();
  getIndexPatternStub.returns(Promise.resolve(indexPatterns));

  var courier = {
    indexPatterns: { get: getIndexPatternStub },
    getStub: getIndexPatternStub
  };

  return courier;
};
