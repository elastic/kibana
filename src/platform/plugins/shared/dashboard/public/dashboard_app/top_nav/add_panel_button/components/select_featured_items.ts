/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MenuItem, MenuItemGroup } from '../types';

const LENS_ACTION_ID = 'addLensPanelAction';
const ESQL_CHART_ACTION_ID = 'ACTION_CREATE_ESQL_CHART';

export const FEATURED_ACTION_IDS: ReadonlySet<string> = new Set([
  LENS_ACTION_ID,
  ESQL_CHART_ACTION_ID,
]);

export function selectFeaturedVisualizationActions(groups: MenuItemGroup[]): {
  lens: MenuItem | undefined;
  esql: MenuItem | undefined;
} {
  let lens: MenuItem | undefined;
  let esql: MenuItem | undefined;

  for (const group of groups) {
    for (const item of group.items) {
      if (!lens && item.id === LENS_ACTION_ID) {
        lens = item;
      } else if (!esql && item.id === ESQL_CHART_ACTION_ID) {
        esql = item;
      }
      if (lens && esql) {
        return { lens, esql };
      }
    }
  }

  return { lens, esql };
}
