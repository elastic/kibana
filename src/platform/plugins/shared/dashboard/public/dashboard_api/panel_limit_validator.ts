/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { MAX_CONTROLS_GROUP_SIZE } from '@kbn/controls-constants';
import { MAX_PANELS } from '../../common/constants';
import type { DashboardSection } from '../../server';
import type { DashboardState } from '../../common/types';

export interface PanelLimitCountState {
  readonly count: number;
  readonly max: number;
  readonly exceeded: boolean;
}

export interface SectionPanelLimitViolation {
  readonly id: string;
  readonly title: string;
  readonly count: number;
  readonly max: number;
}

export interface PanelLimitState {
  readonly isValid: boolean;
  readonly topLevel: PanelLimitCountState;
  readonly pinnedPanels: PanelLimitCountState;
  readonly sectionViolations: ReadonlyArray<SectionPanelLimitViolation>;
}

const isDashboardSection = (
  panelOrSection: DashboardState['panels'][number]
): panelOrSection is DashboardSection => {
  return 'panels' in panelOrSection;
};

export const validatePanelLimits = (state: {
  panels: DashboardState['panels'];
  pinned_panels: DashboardState['pinned_panels'];
}): PanelLimitState => {
  const topLevelCount = state.panels.length;
  const pinnedPanelsCount = state.pinned_panels?.length ?? 0;

  const sectionViolations: SectionPanelLimitViolation[] = [];
  for (const panelOrSection of state.panels) {
    if (!isDashboardSection(panelOrSection)) continue;

    const sectionId = panelOrSection.id;
    if (!sectionId) continue; // should not happen at validation time, but keep validator defensive

    const sectionCount = panelOrSection.panels.length;
    if (sectionCount > MAX_PANELS) {
      sectionViolations.push({
        id: sectionId,
        title: panelOrSection.title,
        count: sectionCount,
        max: MAX_PANELS,
      });
    }
  }

  const topLevel: PanelLimitCountState = {
    count: topLevelCount,
    max: MAX_PANELS,
    exceeded: topLevelCount > MAX_PANELS,
  };

  const pinnedPanels: PanelLimitCountState = {
    count: pinnedPanelsCount,
    max: MAX_CONTROLS_GROUP_SIZE,
    exceeded: pinnedPanelsCount > MAX_CONTROLS_GROUP_SIZE,
  };

  const isValid = !topLevel.exceeded && !pinnedPanels.exceeded && sectionViolations.length === 0;

  return {
    isValid,
    topLevel,
    pinnedPanels,
    sectionViolations,
  };
};
