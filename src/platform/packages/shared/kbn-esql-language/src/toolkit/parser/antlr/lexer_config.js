/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Lexer } from 'antlr4';

if (!Lexer) {
  throw new Error('Failed to import Lexer from antlr4');
}

export default class lexer_config extends Lexer {
  constructor(...args) {
    super(...args);
    this._promqlDepth = 0;
  }

  isDevVersion() {
    return true;
  }

  hasMetricsCommand() {
    return true;
  }

  // PromQL parenthesis depth tracking for nested parentheses in PromQL queries
  incPromqlDepth() {
    this._promqlDepth++;
  }

  decPromqlDepth() {
    this._promqlDepth--;
  }

  resetPromqlDepth() {
    this._promqlDepth = 0;
  }

  getPromqlDepth() {
    return this._promqlDepth;
  }

  isPromqlQuery() {
    return this._promqlDepth > 0;
  }
}
