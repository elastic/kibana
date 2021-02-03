/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import _ from 'lodash';
import { SharedComponent } from './shared_component';
/** A component that suggests one of the give options, but accepts anything */
export class ListComponent extends SharedComponent {
  constructor(name, list, parent, multiValued, allowNonValidValues) {
    super(name, parent);
    this.listGenerator = Array.isArray(list)
      ? function () {
          return list;
        }
      : list;
    this.multiValued = _.isUndefined(multiValued) ? true : multiValued;
    this.allowNonValidValues = _.isUndefined(allowNonValidValues) ? false : allowNonValidValues;
  }
  getTerms(context, editor) {
    if (!this.multiValued && context.otherTokenValues) {
      // already have a value -> no suggestions
      return [];
    }
    let alreadySet = context.otherTokenValues || [];
    if (_.isString(alreadySet)) {
      alreadySet = [alreadySet];
    }
    let ret = _.difference(this.listGenerator(context, editor), alreadySet);

    if (this.getDefaultTermMeta()) {
      const meta = this.getDefaultTermMeta();
      ret = _.map(ret, function (term) {
        if (_.isString(term)) {
          term = { name: term };
        }
        return _.defaults(term, { meta: meta });
      });
    }

    return ret;
  }

  validateTokens(tokens) {
    if (!this.multiValued && tokens.length > 1) {
      return false;
    }

    // verify we have all tokens
    const list = this.listGenerator();
    const notFound = _.some(tokens, function (token) {
      return list.indexOf(token) === -1;
    });

    if (notFound) {
      return false;
    }
    return true;
  }

  getContextKey() {
    return this.name;
  }

  getDefaultTermMeta() {
    return this.name;
  }

  match(token, context, editor) {
    if (!Array.isArray(token)) {
      token = [token];
    }
    if (!this.allowNonValidValues && !this.validateTokens(token, context, editor)) {
      return null;
    }

    const result = super.match(token, context, editor);
    result.context_values = result.context_values || {};
    result.context_values[this.getContextKey()] = token;
    return result;
  }
}
