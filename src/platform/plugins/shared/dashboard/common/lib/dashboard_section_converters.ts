/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DashboardSectionMap, DashboardSectionState } from '../dashboard_container/types';

export const convertSectionArrayToSectionMap = (
  sections?: DashboardSectionState[]
): DashboardSectionMap | undefined => {
  if ((sections ?? []).length === 0) return undefined;
  const sectionsMap: DashboardSectionMap = {};
  sections?.forEach((section, idx) => {
    const sectionId = section.id ?? String(idx);
    sectionsMap[sectionId] = {
      ...section,
      id: sectionId,
    };
  });
  return sectionsMap;
};

export const convertSectionMapToSectionArray = (
  sections?: DashboardSectionMap
): DashboardSectionState[] | undefined => {
  const sectionEntries = Object.entries(sections ?? {});
  if (sectionEntries.length === 0) return undefined;
  return sectionEntries.map(([sectionId, section]) => {
    return {
      ...section,
      id: sectionId,
    };
  });
};
