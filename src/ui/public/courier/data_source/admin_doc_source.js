/**
 * @name AdminDocSource
 */

import _ from 'lodash';

import AbstractDocSource from './_abstract_doc_source';
import DocStrategyProvider from '../fetch/strategy/doc_admin';
import DocRequestProvider from '../fetch/request/doc_admin';

export default function DocSourceFactory(Private) {
  let DocSourceAbstract = Private(AbstractDocSource);
  let docStrategy = Private(DocStrategyProvider);
  let DocRequest = Private(DocRequestProvider);

  _.class(AdminDocSource).inherits(DocSourceAbstract);
  function AdminDocSource(initialState) {
    AdminDocSource.Super.call(this, initialState, docStrategy);
  }

  AdminDocSource.prototype._createRequest = function (defer) {
    return new DocRequest(this, defer);
  };

  return AdminDocSource;
};
