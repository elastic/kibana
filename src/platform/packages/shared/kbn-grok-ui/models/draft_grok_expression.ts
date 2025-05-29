/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { GrokCollection, GrokPattern } from './grok_collection_and_pattern';

export class DraftGrokExpression {
  private expression: string | undefined = undefined;
  private grokPattern: GrokPattern;

  constructor(collection: GrokCollection, expression?: string) {
    this.grokPattern = new GrokPattern(expression || '', 'DRAFT_GROK_EXPRESSION', collection);
    this.grokPattern.resolvePattern();
  }

  public updateExpression = (expression: string) => {
    this.expression = expression;
    this.grokPattern.updatePattern(this.expression);
    this.grokPattern.resolvePattern(true);
  };

  public parse = (samples: string[]) => {
    return this.grokPattern.parse(samples, true);
  };

  public getRegex = () => {
    return this.grokPattern.getRegex();
  };

  public getRegexPattern = () => {
    return this.grokPattern.getRegexPattern();
  };

  public getFields = () => {
    return this.grokPattern.getFields();
  };
}
