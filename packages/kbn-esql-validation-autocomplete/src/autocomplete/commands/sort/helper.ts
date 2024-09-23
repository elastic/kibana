/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const regexStart = /.+\|\s*so?r?(?<start>t?)(.+,)?(?<space1>\s+)?/i;
const regex =
  /.+\|\s*sort(.+,)?((?<space1>\s+)(?<column>[^\s]+)(?<space2>\s*)(?<order>(AS?C?)|(DE?S?C?))?(?<space3>\s*)(?<nulls>NU?L?L?S? ?(FI?R?S?T?|LA?S?T?)?)?(?<space4>\s*))?/i;

export interface SortCaretPosition {
  /**
   * Position of the caret in the sort command:
   *
   * ```
   * SORT <column> [ASC/DESC] [NULLS FIRST/NULLS LAST]
   * |  | |       |   |      |      |                 |
   * |  | |       |   |      |      |                 space4
   * |  | |       |   |      |      nulls
   * |  | |       |   |      space3
   * |  | |       |   order
   * |  | |       space 2
   * |  | |
   * |  | column
   * |  start
   * pre-start
   * ```
   */
  pos:
    | 'none'
    | 'pre-start'
    | 'start'
    | 'space1'
    | 'column'
    | 'space2'
    | 'order'
    | 'space3'
    | 'nulls'
    | 'space4';
  order: string;
  nulls: string;
}

export const getSortPos = (query: string): SortCaretPosition => {
  const match = query.match(regex);
  let pos: SortCaretPosition['pos'] = 'none';
  let order: SortCaretPosition['order'] = '';
  let nulls: SortCaretPosition['nulls'] = '';

  if (match?.groups?.space4) {
    pos = 'space4';
  } else if (match?.groups?.nulls) {
    pos = 'nulls';
    nulls = match.groups.nulls.toUpperCase();
  } else if (match?.groups?.space3) {
    pos = 'space3';
  } else if (match?.groups?.order) {
    pos = 'order';
    order = match.groups.order.toUpperCase();
  } else if (match?.groups?.space2) {
    pos = 'space2';
  } else if (match?.groups?.column) {
    pos = 'column';
  } else {
    const match2 = query.match(regexStart);

    if (match2?.groups?.space1) {
      pos = 'space1';
    } else if (match2?.groups?.start) {
      pos = 'start';
    } else if (match2) {
      pos = 'pre-start';
    }
  }

  return {
    pos,
    order,
    nulls,
  };
};
