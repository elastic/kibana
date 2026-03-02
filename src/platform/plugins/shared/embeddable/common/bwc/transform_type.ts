/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export function transformType(type: string) {
  // Pre 9.4 typed markdown embeddable as DASHBOARD_MARKDOWN
  if (type === 'DASHBOARD_MARKDOWN') {
    return 'markdown';
  }

  if (type === 'timeSlider') {
    return 'time_slider_control';
  }

  if (type === 'rangeSliderControl') {
    return 'range_slider_control';
  }

  if (type === 'optionsListControl') {
    return 'options_list_control';
  }

  if (type === 'esqlControl') {
    return 'esql_control';
  }

  return type;
}
