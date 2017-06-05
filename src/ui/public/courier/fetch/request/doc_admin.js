import { DocAdminStrategyProvider } from '../strategy/doc_admin';
import { AbstractDocRequestProvider } from './_abstract_doc';

export function AdminDocRequestProvider(Private) {

  const docStrategy = Private(DocAdminStrategyProvider);
  const AbstractDocRequest = Private(AbstractDocRequestProvider);

  class AdminDocRequest extends AbstractDocRequest {
    strategy = docStrategy;
  }

  return AdminDocRequest;
}
