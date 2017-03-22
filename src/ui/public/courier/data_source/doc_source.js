import AbstractDocSourceProvider from './_abstract_doc_source';
import DocStrategyProvider from '../fetch/strategy/doc_data';
import DocRequestProvider from '../fetch/request/doc_data';

export default function DocSourceFactory(Private) {
  const AbstractDocSource = Private(AbstractDocSourceProvider);
  const docStrategy = Private(DocStrategyProvider);
  const DocRequest = Private(DocRequestProvider);

  class DocSource extends AbstractDocSource {
    constructor(initialState) {
      super(initialState, docStrategy);
    }

    _createRequest(defer) {
      return new DocRequest(this, defer);
    }
  }

  return DocSource;
}
