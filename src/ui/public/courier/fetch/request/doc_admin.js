import DocStrategyProvider from '../strategy/doc_admin';
import AbstractDocRequestProvider from './_abstract_doc';

export default function DocRequestProvider(Private) {

  const docStrategy = Private(DocStrategyProvider);
  const AbstractDocRequest = Private(AbstractDocRequestProvider);

  class AdminDocRequest extends AbstractDocRequest {
    strategy = docStrategy;
  }

  return AdminDocRequest;
}
