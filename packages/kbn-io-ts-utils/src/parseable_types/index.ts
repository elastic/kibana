/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import * as t from 'io-ts';
import { MergeType } from '../merge_rt';

export type ParseableType =
  | t.StringType
  | t.NumberType
  | t.BooleanType
  | t.ArrayType<t.Mixed>
  | t.RecordC<t.Mixed, t.Mixed>
  | t.DictionaryType<t.Mixed, t.Mixed>
  | t.InterfaceType<t.Props>
  | t.PartialType<t.Props>
  | t.UnionType<t.Mixed[]>
  | t.IntersectionType<t.Mixed[]>
  | t.LiteralType<string | boolean | number>
  | MergeType<t.Mixed, t.Mixed>;

const parseableTags = [
  'StringType',
  'NumberType',
  'BooleanType',
  'ArrayType',
  'DictionaryType',
  'InterfaceType',
  'PartialType',
  'UnionType',
  'IntersectionType',
  'MergeType',
  'LiteralType',
];

export const isParsableType = (type: t.Type<any> | ParseableType): type is ParseableType => {
  return '_tag' in type && parseableTags.includes(type._tag);
};
