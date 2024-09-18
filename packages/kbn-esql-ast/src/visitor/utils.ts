/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ESQLAstItem, ESQLSingleAstItem } from '../types';

/**
 * Normalizes AST "item" list to only contain *single* items.
 *
 * @param items A list of single or nested items.
 */
export function* singleItems(items: Iterable<ESQLAstItem>): Iterable<ESQLSingleAstItem> {
  for (const item of items) {
    if (Array.isArray(item)) {
      yield* singleItems(item);
    } else {
      yield item;
    }
  }
}

/**
 * Returns the first normalized "single item" from the "item" list.
 *
 * @param items Returns the first "single item" from the "item" list.
 * @returns A "single item", if any.
 */
export const firstItem = (items: ESQLAstItem[]): ESQLSingleAstItem | undefined => {
  for (const item of singleItems(items)) {
    return item;
  }
};
