/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/*
 * Use this function with any match params coming from react router to safely decode values.
 * After an update to react router v6, this functions should be deprecated.
 * Known issue for navigation with special characters in paths
 * https://github.com/elastic/kibana/issues/82440
 */
export const attemptToURIDecode = (value?: string): string | undefined => {
  let result = value;
  try {
    result = value ? decodeURIComponent(value) : value;
  } catch (e) {
    // do nothing
  }
  return result;
};
