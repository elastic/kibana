/**
 * @name DocSource
 */

import _ from 'lodash';

import AbstractDocSource from './_abstract_doc_source';
import DocStrategyProvider from '../fetch/strategy/doc_data';
import DocRequestProvider from '../fetch/request/doc_data';

export default function DocSourceFactory(Private) {
  let DocSourceAbstract = Private(AbstractDocSource);
  let docStrategy = Private(DocStrategyProvider);
  let DocRequest = Private(DocRequestProvider);

  _.class(DocSource).inherits(DocSourceAbstract);
  function DocSource(initialState) {
    DocSource.Super.call(this, initialState, docStrategy);
  }

  DocSource.prototype._createRequest = function (defer) {
    return new DocRequest(this, defer);
  };

  return DocSource;
};
