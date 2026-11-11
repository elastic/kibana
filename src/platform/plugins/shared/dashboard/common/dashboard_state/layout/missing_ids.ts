/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DashboardState } from '@kbn/as-code-dashboard-schema';

interface LayoutItem {
  id?: string;
  panels?: LayoutItem[];
}

const getLayoutIds = (items: LayoutItem[] = []): string[] =>
  items.flatMap(({ id, panels }) => [...(id === undefined ? [] : [id]), ...getLayoutIds(panels)]);

/**
 * Returns an id prefix that no explicit panel, section, or pinned panel id in the given states starts with,
 * so ids generated with `assignMissingIds` cannot collide with explicit ids.
 */
export function getGeneratedIdPrefix(...states: DashboardState[]): string {
  const explicitIds = states.flatMap((state) => [
    ...getLayoutIds(state.panels as LayoutItem[]),
    ...getLayoutIds(state.pinned_panels),
  ]);
  let prefix = '__generated:';
  while (explicitIds.some((id) => id.startsWith(prefix))) {
    prefix = `_${prefix}`;
  }
  return prefix;
}

/**
 * Gives every item without an id a deterministic id based on its position, so equal states generate equal ids.
 * Returns copies, the inputs are not mutated.
 */
export const assignMissingIds = <Item extends LayoutItem>(
  items: Item[] | undefined,
  prefix: string
): Item[] =>
  (items ?? []).map((item, index) => ({
    ...item,
    id: item.id ?? `${prefix}${index}`,
    ...(item.panels && { panels: assignMissingIds(item.panels, `${prefix}${index}:`) }),
  }));
