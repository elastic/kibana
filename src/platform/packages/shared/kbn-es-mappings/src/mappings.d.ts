/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  DateMapping,
  KeywordMapping,
  TextMapping,
  MatchOnlyTextMapping,
  SemanticTextMapping,
  DateNanosMapping,
  IntegerMapping,
  LongMapping,
  ShortMapping,
  BooleanMapping,
  FlattenedMapping,
  ObjectMapping,
} from './types';
import type { WithoutTypeField } from './types_helpers';
export declare function object<T>(def: WithoutTypeField<ObjectMapping<T>>): ObjectMapping<T>;
export declare function matchOnlyText(
  def?: WithoutTypeField<MatchOnlyTextMapping>
): MatchOnlyTextMapping;
export declare function semanticText(
  def?: WithoutTypeField<SemanticTextMapping>
): SemanticTextMapping;
export declare function text(def?: WithoutTypeField<TextMapping>): TextMapping;
export declare function keyword(def?: WithoutTypeField<KeywordMapping>): KeywordMapping;
export declare function date(def?: WithoutTypeField<DateMapping>): DateMapping;
export declare function dateNanos(def?: WithoutTypeField<DateNanosMapping>): DateNanosMapping;
export declare function integer(def?: WithoutTypeField<IntegerMapping>): IntegerMapping;
export declare function long(def?: WithoutTypeField<LongMapping>): LongMapping;
export declare function short(def?: WithoutTypeField<ShortMapping>): ShortMapping;
export declare function boolean(def?: WithoutTypeField<BooleanMapping>): BooleanMapping;
export declare function flattened(def?: WithoutTypeField<FlattenedMapping>): FlattenedMapping;
