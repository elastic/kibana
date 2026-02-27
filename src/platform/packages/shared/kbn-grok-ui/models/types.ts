/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// The only supported semantic conversions are int and float. By default all semantics are saved as strings.
// https://www.elastic.co/guide/en/logstash/current/plugins-filters-grok.html#_grok_basics
export enum SupportedTypeConversion {
  int = 'int',
  float = 'float',
}

export interface FieldDefinition {
  name: string;
  type: SupportedTypeConversion | null;
  colour: string;
  pattern: string;
}
