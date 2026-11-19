/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Subscription } from 'rxjs';
import { BehaviorSubject } from 'rxjs';
import type { GrokCollection, GrokFieldUsageSource } from './grok_collection_and_pattern';
import { GrokPattern } from './grok_collection_and_pattern';

export interface DraftGrokExpressionOptions {
  patternSlotId?: string | number;
}

export class DraftGrokExpression implements GrokFieldUsageSource {
  private expression: string = '';
  private grokPattern: GrokPattern;
  private expression$: BehaviorSubject<string>;
  private customPatternsSubscription: Subscription;
  private readonly unregisterFieldUsage: () => void;
  private previousFieldNames: Set<string>;
  private readonly patternSlotId: string | number | undefined;

  constructor(
    collection: GrokCollection,
    initialExpression?: string,
    options?: DraftGrokExpressionOptions
  ) {
    const expression = initialExpression ?? '';
    this.expression = expression;
    this.patternSlotId = options?.patternSlotId;
    this.previousFieldNames = collection.parseFieldNames(expression);
    this.unregisterFieldUsage = collection.registerFieldUsageSource(this);
    this.grokPattern = new GrokPattern(expression || '', 'DRAFT_GROK_EXPRESSION', collection);
    this.grokPattern.resolvePattern();
    this.expression$ = new BehaviorSubject<string>(expression);
    collection.flushFieldUsage();
    this.customPatternsSubscription = collection.customPatternsChanged$.subscribe(() => {
      this.grokPattern.resolvePattern(true);
      this.expression$.next(this.expression);
    });
  }

  public updateExpression = (expression: string) => {
    const collection = this.grokPattern.getParentCollection();
    const nextFieldNames = collection.parseFieldNames(expression);
    collection.reconcileFieldUsage(this, this.previousFieldNames, nextFieldNames);
    this.expression = expression;
    this.previousFieldNames = nextFieldNames;
    this.grokPattern.updatePattern(this.expression);
    this.grokPattern.resolvePattern(true);
    collection.flushFieldUsage();
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

  public getFieldNames = (): ReadonlySet<string> => {
    return this.previousFieldNames;
  };

  public getPatternSlotId = () => {
    return this.patternSlotId;
  };

  public getExpression$ = () => {
    return this.expression$;
  };

  public destroy = () => {
    this.customPatternsSubscription.unsubscribe();
    this.unregisterFieldUsage();
    this.grokPattern.getParentCollection().flushFieldUsage();
  };
}
