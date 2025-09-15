/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublishingSubject } from '@kbn/presentation-publishing';
import type { Observable } from 'rxjs';
import { combineLatest, distinctUntilChanged, map } from 'rxjs';
import type { DashboardChildren, DashboardLayout } from './types';

export function isSectionCollapsed(
  sections: DashboardLayout['sections'],
  sectionId?: string
): boolean {
  return Boolean(sectionId && sections[sectionId].collapsed);
}

function isPanelActive(panelId: string, layout: DashboardLayout) {
  return !isSectionCollapsed(layout.sections, layout.panels[panelId].gridData.sectionId);
}

export function getActivePanelCount(layout: DashboardLayout) {
  return Object.keys(layout.panels).filter((panelId) => isPanelActive(panelId, layout)).length;
}

export function childrenReady$(
  children$: PublishingSubject<DashboardChildren>,
  layout$: PublishingSubject<DashboardLayout>
): Observable<boolean> {
  return combineLatest([children$, layout$]).pipe(
    map(([children, layout]) => {
      const hasMissingApi = Object.keys(layout.panels).some((panelId) => {
        // do not check api for non-active panels
        if (!isPanelActive(panelId, layout)) return false;

        return children[panelId] === undefined;
      });

      return !hasMissingApi;
    }),
    distinctUntilChanged()
  );
}
