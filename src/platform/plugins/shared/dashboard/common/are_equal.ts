/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import deepEqual from 'fast-deep-equal';
import type {
  DashboardPanel,
  DashboardPinnedPanel,
  DashboardSection,
  DashboardState,
} from '@kbn/as-code-dashboard-schema';
import { areComparatorsEqual, type StateComparators } from '@kbn/presentation-publishing';
import { isDashboardPanel } from './is_dashboard_panel';

type PanelOrSection = DashboardPanel | DashboardSection;
type GetComparators = (type: string, embeddableState: object) => StateComparators<object>;

function arePanelsEqual(a: DashboardPanel, b: DashboardPanel, getComparators: GetComparators) {
  const { config: configA, ...restA } = a;
  const { config: configB, ...restB } = b;
  if (!deepEqual(restA, restB)) return false;
  return areComparatorsEqual(getComparators(b.type, configB), configA as object, configB as object);
}

function areWidgetsEqual(a: PanelOrSection, b: PanelOrSection, getComparators: GetComparators) {
  if (isDashboardPanel(a) && isDashboardPanel(b)) return arePanelsEqual(a, b, getComparators);
  if (isDashboardPanel(a) !== isDashboardPanel(b)) return false;

  const { panels: panelsA, ...sectionA } = a as DashboardSection;
  const { panels: panelsB, ...sectionB } = b as DashboardSection;
  return deepEqual(sectionA, sectionB) && arePanelsListEqual(panelsA, panelsB, getComparators);
}

function arePanelsListEqual(
  a: PanelOrSection[] | undefined,
  b: PanelOrSection[] | undefined,
  getComparators: GetComparators
): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;

  const bById = new Map<string, PanelOrSection>();
  b.forEach((widget) => {
    if (widget.id) bById.set(widget.id, widget);
  });

  return a.every((widgetA, index) => {
    const widgetB = widgetA.id ? bById.get(widgetA.id) : b[index];
    return widgetB !== undefined && areWidgetsEqual(widgetA, widgetB, getComparators);
  });
}

/** Pinned panel order is meaningful, so pinned panels are compared by index. */
function arePinnedPanelsEqual(
  a: DashboardPinnedPanel[] | undefined,
  b: DashboardPinnedPanel[] | undefined,
  getComparators: GetComparators
): boolean {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;

  return a.every((pinnedA, index) => {
    const pinnedB = b[index];
    const { config: configA, ...restA } = pinnedA;
    const { config: configB, ...restB } = pinnedB;
    if (!deepEqual(restA, restB)) return false;
    return areComparatorsEqual(
      getComparators(pinnedB.type, configB),
      configA as object,
      configB as object
    );
  });
}

/**
 * Checks whether two dashboard states are equal.
 *
 * `panels` and `pinned_panels` are compared with the comparators returned by `getComparators`.
 * All other keys are compared with deep equality.
 */
export function areEqual(
  a: DashboardState,
  b: DashboardState,
  getComparators: GetComparators
): boolean {
  const { panels: panelsA, pinned_panels: pinnedPanelsA, ...restA } = a;
  const { panels: panelsB, pinned_panels: pinnedPanelsB, ...restB } = b;

  return (
    deepEqual(restA, restB) &&
    arePinnedPanelsEqual(
      pinnedPanelsA as DashboardPinnedPanel[] | undefined,
      pinnedPanelsB as DashboardPinnedPanel[] | undefined,
      getComparators
    ) &&
    arePanelsListEqual(panelsA as PanelOrSection[], panelsB as PanelOrSection[], getComparators)
  );
}
