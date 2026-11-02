/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const COLOR_FORMAT_DEFAULT_PARAMS = {
  fieldType: 'string',
  range: 'min:max',
  regex: '<insert regex>',
  text: '#000000',
  background: '#ffffff',
  boolean: true,
};

export const DURATION_FORMAT_DEFAULT_PARAMS = {
  inputFormat: 'seconds',
  outputFormat: 'humanize',
};

export const HISTOGRAM_FORMAT_DEFAULT_FORMAT = 'number';
export const URL_DEFAULT_TYPE = 'a';

export const FORMATS_WITHOUT_PARAMS = ['boolean', 'currency', 'ip', 'relative_date'];
export const FORMATS_WITH_PATTERN = ['bytes', 'date_nanos', 'date', 'number', 'percent'];
