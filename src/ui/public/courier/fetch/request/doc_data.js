import DocStrategyProvider from '../strategy/doc_data';
import AbstractDocRequestProvider from './_abstract_doc';

export default function DocRequestProvider(Private) {

  const docStrategy = Private(DocStrategyProvider);
  const AbstractDocRequest = Private(AbstractDocRequestProvider);

  class DataDocRequest extends AbstractDocRequest {
    strategy = docStrategy;
  }

  return DataDocRequest;
}
