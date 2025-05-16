/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DashboardSectionMap } from '..';
import { type DashboardSections } from '../../server/content_management';

export const convertSectionArrayToSectionMap = (
  sections?: DashboardSections
): DashboardSectionMap | undefined => {
  if ((sections ?? []).length === 0) return undefined;
  const sectionsMap: DashboardSectionMap = {};
  sections?.forEach((section, idx) => {
    const sectionId = section.id ?? String(idx);
    sectionsMap[sectionId] = {
      ...section,
      id: sectionId,
      order: section.order ?? idx + 1,
    };
  });
  return sectionsMap;
};

export const convertSectionMapToSectionArray = (
  sections?: DashboardSectionMap
): DashboardSections | undefined => {
  const sectionEntries = Object.entries(sections ?? {});
  if (sectionEntries.length === 0) return undefined;
  return sectionEntries.map(([sectionId, section]) => {
    return {
      ...section,
      id: sectionId,
    };
  });
};
