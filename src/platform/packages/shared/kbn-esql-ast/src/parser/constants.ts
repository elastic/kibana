/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Token } from 'antlr4';

export const DEFAULT_CHANNEL: number = +(Token as any).DEFAULT_CHANNEL;
export const HIDDEN_CHANNEL: number = +(Token as any).HIDDEN_CHANNEL;

export const SOURCE_COMMANDS = new Set<string>(['FROM', 'ROW', 'SHOW', 'TS', 'EXPLAIN']);

// FROM https://github.com/elastic/elasticsearch/blob/a2dbb7b9174b109d89fa2da87645ecd4d4e8de14/x-pack/plugin/esql/src/main/java/org/elasticsearch/xpack/esql/type/EsqlDataTypeConverter.java#L174
export const TIME_DURATION_UNITS = [
  'MILLISECOND',
  'MILLISECONDS',
  'MS',
  'SECOND',
  'SECONDS',
  'SEC',
  'S',
  'MINUTE',
  'MINUTES',
  'MIN',
  'HOUR',
  'HOURS',
  'H',
];
