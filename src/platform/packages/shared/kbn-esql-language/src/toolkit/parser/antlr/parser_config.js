/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Parser } from 'antlr4';

if (!Parser) {
  throw new Error('Failed to import Parser from antlr4');
}

export default class parser_config extends Parser {
  constructor(...args) {
    super(...args);
  }

  isDevVersion() {
    return true;
  }

  hasMetricsCommand() {
    return true;
  }
}
