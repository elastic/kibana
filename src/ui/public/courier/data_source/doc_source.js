/**
 * @name DocSource
 */

import _ from 'lodash';

import AbstractDocSourceProvider from './_abstract_doc_source';
import DocStrategyProvider from '../fetch/strategy/doc_data';
import DocRequestProvider from '../fetch/request/doc_data';

export default function DocSourceFactory(Private) {
  let AbstractDocSource = Private(AbstractDocSourceProvider);
  let docStrategy = Private(DocStrategyProvider);
  let DocRequest = Private(DocRequestProvider);

  class DocSource extends AbstractDocSource {
    constructor(initialState) {
      super(initialState, docStrategy);
    }

    _createRequest(defer) {
      return new DocRequest(this, defer);
    };
  }

  return DocSource;
};
