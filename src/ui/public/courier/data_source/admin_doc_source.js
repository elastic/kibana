/**
 * @name AdminDocSource
 */

import _ from 'lodash';

import AbstractDocSourceProvider from './_abstract_doc_source';
import DocStrategyProvider from '../fetch/strategy/doc_admin';
import DocRequestProvider from '../fetch/request/doc_admin';

export default function DocSourceFactory(Private) {
  let AbstractDocSource = Private(AbstractDocSourceProvider);
  let docStrategy = Private(DocStrategyProvider);
  let DocRequest = Private(DocRequestProvider);

  class AdminDocSource extends AbstractDocSource {
    constructor(initialState) {
      super(initialState, docStrategy);
    }

    _createRequest(defer) {
      return new DocRequest(this, defer);
    };
  }

  return AdminDocSource;
};
