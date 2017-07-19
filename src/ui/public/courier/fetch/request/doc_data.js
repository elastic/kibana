import { DocDataStrategyProvider } from '../strategy/doc_data';
import { AbstractDocRequestProvider } from './_abstract_doc';

export function DocDataRequestProvider(Private) {

  const docStrategy = Private(DocDataStrategyProvider);
  const AbstractDocRequest = Private(AbstractDocRequestProvider);

  class DataDocRequest extends AbstractDocRequest {
    strategy = docStrategy;
  }

  return DataDocRequest;
}
