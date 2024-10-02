/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type { Reference } from '@kbn/content-management-utils';
import { DashboardPanelMap } from '../../common';
import { getReferencesForPanelId } from '../../common/dashboard_container/persistable_state/dashboard_container_references';

export function initializePanelsManager(
  initialPanels: DashboardPanelMap,
  initialReferences: Reference[]
) {
  const children$ = new BehaviorSubject<{
    [key: string]: unknown;
  }>({});
  const panels$ = new BehaviorSubject(initialPanels);
  let references: Reference[] = initialReferences;

  return {
    children$,
    getSerializedStateForChild: (childId: string) => {
      const rawState = panels$.value[childId]?.explicitInput ?? { id: childId };
      const { id, ...serializedState } = rawState;
      return Object.keys(serializedState).length === 0
        ? undefined
        : {
            rawState,
            references: getReferencesForPanelId(childId, references),
          };
    },
    panels$,
    references,
    setPanels: (panels: DashboardPanelMap) => {
      panels$.next(panels);
    },
    setReferences: (nextReferences: Reference[]) => (references = nextReferences),
  };
}
