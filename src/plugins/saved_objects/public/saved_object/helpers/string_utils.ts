/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

export class StringUtils {
  /**
   * Returns a version of the string with the first letter capitalized.
   * @param str {string}
   * @returns {string}
   */
  public static upperFirst(str: string = ''): string {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : '';
  }
}
