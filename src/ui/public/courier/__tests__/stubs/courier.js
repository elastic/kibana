import sinon from 'ui/sinon';
import { StubLogstashIndexPatternProvider } from 'ui/index_patterns/__tests__/stubs';

export function StubCourierProvider(Private, Promise) {
  const indexPatterns = Private(StubLogstashIndexPatternProvider);
  const getIndexPatternStub = sinon.stub()
    .returns(Promise.resolve(indexPatterns));

  const courier = {
    indexPatterns: { get: getIndexPatternStub },
    getStub: getIndexPatternStub
  };

  return courier;
}
