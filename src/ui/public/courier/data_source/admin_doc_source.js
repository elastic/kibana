import { AbstractDocSourceProvider } from './_abstract_doc_source';
import { DocAdminStrategyProvider } from '../fetch/strategy/doc_admin';
import { AdminDocRequestProvider } from '../fetch/request/doc_admin';

export function AdminDocSourceProvider(Private) {
  const AbstractDocSource = Private(AbstractDocSourceProvider);
  const DocAdminStrategy = Private(DocAdminStrategyProvider);
  const AdminDocRequest = Private(AdminDocRequestProvider);

  class AdminDocSource extends AbstractDocSource {
    constructor(initialState) {
      super(initialState, DocAdminStrategy);
    }

    _createRequest(defer) {
      return new AdminDocRequest(this, defer);
    }
  }

  return AdminDocSource;
}
