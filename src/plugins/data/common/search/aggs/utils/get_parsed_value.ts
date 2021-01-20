/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

/**
 * This method parses a JSON string and constructs the Object or object described by the string.
 * If the given string is not valid JSON, you will get a syntax error.
 * @param data { Object } - an object that contains the required for parsing field
 * @param key { string} - name of the field to be parsed
 *
 * @internal
 */
export const getParsedValue = (data: any, key: string) => {
  try {
    return data[key] ? JSON.parse(data[key]) : undefined;
  } catch (e) {
    throw new Error(`Unable to parse ${key} argument string`);
  }
};
