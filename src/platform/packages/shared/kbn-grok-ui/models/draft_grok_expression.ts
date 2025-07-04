/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject, Subscription } from 'rxjs';
import { GrokCollection, GrokPattern } from './grok_collection_and_pattern';

export class DraftGrokExpression {
  private expression: string = '';
  private grokPattern: GrokPattern;
  private expression$: BehaviorSubject<string>;
  private customPatternsSubscription: Subscription;

  constructor(collection: GrokCollection, initialExpression?: string) {
    const expression = initialExpression ?? '';
    this.expression = expression;
    this.grokPattern = new GrokPattern(expression || '', 'DRAFT_GROK_EXPRESSION', collection);
    this.grokPattern.resolvePattern();
    this.expression$ = new BehaviorSubject<string>(expression);
    this.customPatternsSubscription = collection.customPatternsChanged$.subscribe(() => {
      this.grokPattern.resolvePattern(true);
      this.expression$.next(this.expression);
    });
  }

  public updateExpression = (expression: string) => {
    this.expression = expression;
    this.grokPattern.updatePattern(this.expression);
    this.grokPattern.resolvePattern(true);
    this.expression$.next(this.expression);
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

  public getExpression = () => {
    return this.expression;
  };

  public getExpression$ = () => {
    return this.expression$;
  };

  public destroy() {
    this.customPatternsSubscription.unsubscribe();
  }
}
