import AbstractDocSourceProvider from './_abstract_doc_source';
import DocStrategyProvider from '../fetch/strategy/doc_admin';
import DocRequestProvider from '../fetch/request/doc_admin';

export default function DocSourceFactory(Private) {
  const AbstractDocSource = Private(AbstractDocSourceProvider);
  const docStrategy = Private(DocStrategyProvider);
  const DocRequest = Private(DocRequestProvider);

  class AdminDocSource extends AbstractDocSource {
    constructor(initialState) {
      super(initialState, docStrategy);
    }

    _createRequest(defer) {
      return new DocRequest(this, defer);
    }
  }

  return AdminDocSource;
}
