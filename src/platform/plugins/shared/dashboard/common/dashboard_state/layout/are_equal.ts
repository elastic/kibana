/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';
import { asyncForEach } from '@kbn/std';
import type { DashboardState } from '@kbn/as-code-dashboard-schema';
import { areComparatorsEqual, type StateComparators } from '@kbn/presentation-publishing';
import { deserializeLayout } from './deserialize_layout';
import { arePanelLayoutsEqual, arePinnedPanelLayoutsEqual } from './are_layouts_equal';

export type GetComparators = (
  type: string,
  embeddableState: object
) => Promise<StateComparators<object> | undefined>;

interface LayoutItem {
  id?: string;
  panels?: LayoutItem[];
}

const getLayoutIds = (items: LayoutItem[] = []): string[] =>
  items.flatMap(({ id, panels }) => [...(id === undefined ? [] : [id]), ...getLayoutIds(panels)]);

/** Gives every item an id so items without one are matched by position. */
const withComparisonIds = <Item extends LayoutItem>(
  items: Item[] | undefined,
  prefix: string
): Item[] =>
  (items ?? []).map((item, index) => ({
    ...item,
    id: item.id ?? `${prefix}${index}`,
    ...(item.panels && { panels: withComparisonIds(item.panels, `${prefix}${index}:`) }),
  }));

async function areConfigsEqual(
  getComparators: GetComparators,
  type: string,
  baselineConfig: object,
  currentConfig: object
) {
  try {
    const comparators = await getComparators(type, currentConfig);
    return comparators
      ? areComparatorsEqual(comparators, baselineConfig, currentConfig)
      : deepEqual(baselineConfig, currentConfig);
  } catch (error) {
    // A failed comparison cannot establish equality.
    return false;
  }
}

/**
 * Checks whether the layout (`panels` and `pinned_panels`) of two dashboard states is equal.
 * Panels and sections are matched by id, or by position when they have none.
 * Pinned panels are matched by id and their order is meaningful.
 * Panel config is compared with the comparators returned by `getComparators`.
 *
 * @returns `true` when both `panels` and `pinned_panels` are equal.
 */
export async function areEqual(
  baseline: DashboardState,
  current: DashboardState,
  getComparators: GetComparators
): Promise<boolean> {
  const explicitIds = [
    ...getLayoutIds(baseline.panels as LayoutItem[]),
    ...getLayoutIds(baseline.pinned_panels),
    ...getLayoutIds(current.panels as LayoutItem[]),
    ...getLayoutIds(current.pinned_panels),
  ];
  let prefix = '__comparison:';
  while (explicitIds.some((id) => id.startsWith(prefix))) {
    prefix = `_${prefix}`;
  }
  const baselineLayout = deserializeLayout(
    withComparisonIds(baseline.panels, `${prefix}panel:`),
    withComparisonIds(baseline.pinned_panels, `${prefix}pinned:`)
  );
  const currentLayout = deserializeLayout(
    withComparisonIds(current.panels, `${prefix}panel:`),
    withComparisonIds(current.pinned_panels, `${prefix}pinned:`)
  );

  if (
    !arePanelLayoutsEqual(baselineLayout.layout, currentLayout.layout) ||
    !arePinnedPanelLayoutsEqual(baselineLayout.layout, currentLayout.layout)
  ) {
    return false;
  }

  // asyncForEach callbacks run concurrently, so the flag is only ever set to false
  const arePanelsEqual = async () => {
    let isEqual = true;
    await asyncForEach(Object.entries(currentLayout.layout.panels), async ([id, { type }]) => {
      if (!isEqual) return;
      const isPanelEqual =
        baselineLayout.layout.panels[id].type === type &&
        (await areConfigsEqual(
          getComparators,
          type,
          baselineLayout.childState[id],
          currentLayout.childState[id]
        ));
      if (!isPanelEqual) isEqual = false;
    });
    return isEqual;
  };

  const arePinnedPanelsEqual = async () => {
    let isEqual = true;
    await asyncForEach(
      Object.entries(currentLayout.layout.pinnedPanels),
      async ([id, { type }]) => {
        if (!isEqual) return;
        const isPinnedPanelEqual = await areConfigsEqual(
          getComparators,
          type,
          baselineLayout.childState[id],
          currentLayout.childState[id]
        );
        if (!isPinnedPanelEqual) isEqual = false;
      }
    );
    return isEqual;
  };

  return (await arePanelsEqual()) && (await arePinnedPanelsEqual());
}
