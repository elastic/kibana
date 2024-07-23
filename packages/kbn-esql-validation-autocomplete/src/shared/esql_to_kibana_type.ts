/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

const ESQL_NUMBER_TYPES = [
  'double',
  'unsigned_long',
  'long',
  'integer',
  'int',
  'counter_integer',
  'counter_long',
  'counter_double',
];

const ESQL_TEXT_TYPES = ['text', 'keyword', 'string'];

export const esqlToKibanaType = (elasticsearchType: string) => {
  if (ESQL_NUMBER_TYPES.includes(elasticsearchType)) {
    return 'number';
  }

  if (ESQL_TEXT_TYPES.includes(elasticsearchType)) {
    return 'string';
  }

  if (['datetime', 'time_duration'].includes(elasticsearchType)) {
    return 'date';
  }

  if (elasticsearchType === 'bool') {
    return 'boolean';
  }

  if (elasticsearchType === 'date_period') {
    return 'time_literal'; // TODO - consider aligning with Elasticsearch
  }

  return elasticsearchType;
};
