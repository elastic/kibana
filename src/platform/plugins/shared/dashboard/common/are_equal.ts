/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';
import { asyncMap } from '@kbn/std';
import type {
  DashboardPanel,
  DashboardPinnedPanel,
  DashboardSection,
  DashboardState,
} from '@kbn/as-code-dashboard-schema';
import { areComparatorsEqual, type StateComparators } from '@kbn/presentation-publishing';
import { isDashboardPanel } from './is_dashboard_panel';

type PanelOrSection = DashboardPanel | DashboardSection;
type GetComparators = (
  type: string,
  embeddableState: object
) => Promise<StateComparators<object> | undefined>;

async function areConfigsEqual(
  getComparators: GetComparators,
  type: string,
  configA: object,
  configB: object
) {
  const comparators = await getComparators(type, configB);
  return comparators
    ? areComparatorsEqual(comparators, configA, configB)
    : deepEqual(configA, configB);
}

async function arePanelsEqual(
  a: DashboardPanel,
  b: DashboardPanel,
  getComparators: GetComparators
): Promise<boolean> {
  const { config: configA, ...restA } = a;
  const { config: configB, ...restB } = b;
  if (!deepEqual(restA, restB)) return false;
  return areConfigsEqual(getComparators, b.type, configA as object, configB as object);
}

async function areWidgetsEqual(
  a: PanelOrSection,
  b: PanelOrSection,
  getComparators: GetComparators
): Promise<boolean> {
  if (isDashboardPanel(a) && isDashboardPanel(b)) return arePanelsEqual(a, b, getComparators);
  if (isDashboardPanel(a) !== isDashboardPanel(b)) return false;

  const { panels: panelsA, ...sectionA } = a as DashboardSection;
  const { panels: panelsB, ...sectionB } = b as DashboardSection;
  return (
    deepEqual(sectionA, sectionB) && (await arePanelsListEqual(panelsA, panelsB, getComparators))
  );
}

async function arePanelsListEqual(
  a: PanelOrSection[] | undefined,
  b: PanelOrSection[] | undefined,
  getComparators: GetComparators
): Promise<boolean> {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;

  const bById = new Map<string, PanelOrSection>();
  b.forEach((widget) => {
    if (widget.id) bById.set(widget.id, widget);
  });

  const results = await asyncMap(a, (widgetA, index) => {
    const widgetB = widgetA.id ? bById.get(widgetA.id) : b[index];
    return widgetB !== undefined ? areWidgetsEqual(widgetA, widgetB, getComparators) : false;
  });
  return results.every(Boolean);
}

/** Pinned panel order is meaningful, so pinned panels are compared by index. */
async function arePinnedPanelsEqual(
  a: DashboardPinnedPanel[] | undefined,
  b: DashboardPinnedPanel[] | undefined,
  getComparators: GetComparators
): Promise<boolean> {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;

  const results = await asyncMap(a, (pinnedA, index) => {
    const pinnedB = b[index];
    const { config: configA, ...restA } = pinnedA;
    const { config: configB, ...restB } = pinnedB;
    if (!deepEqual(restA, restB)) return false;
    return areConfigsEqual(getComparators, pinnedB.type, configA as object, configB as object);
  });
  return results.every(Boolean);
}

/**
 * Checks whether two dashboard states are equal.
 *
 * `panels` and `pinned_panels` are compared with the comparators returned by `getComparators`.
 * All other keys are compared with deep equality.
 */
export async function areEqual(
  a: DashboardState,
  b: DashboardState,
  getComparators: GetComparators
): Promise<boolean> {
  const { panels: panelsA, pinned_panels: pinnedPanelsA, ...restA } = a;
  const { panels: panelsB, pinned_panels: pinnedPanelsB, ...restB } = b;

  if (!deepEqual(restA, restB)) return false;
  return (
    (await arePinnedPanelsEqual(
      pinnedPanelsA as DashboardPinnedPanel[] | undefined,
      pinnedPanelsB as DashboardPinnedPanel[] | undefined,
      getComparators
    )) &&
    (await arePanelsListEqual(
      panelsA as PanelOrSection[],
      panelsB as PanelOrSection[],
      getComparators
    ))
  );
}
