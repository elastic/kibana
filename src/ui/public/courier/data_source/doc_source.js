import { AbstractDocSourceProvider } from './_abstract_doc_source';
import { DocDataStrategyProvider } from '../fetch/strategy/doc_data';
import { DocDataRequestProvider } from '../fetch/request/doc_data';

export function DocSourceProvider(Private) {
  const AbstractDocSource = Private(AbstractDocSourceProvider);
  const docStrategy = Private(DocDataStrategyProvider);
  const DocRequest = Private(DocDataRequestProvider);

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
