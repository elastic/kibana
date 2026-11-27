/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { MenuItem, SecondaryMenuSection } from '../../types';

/**
 * Appends supplementary sections without allocating a new array when there is nothing to append.
 */
const appendSupplementarySections = (
  sections: SecondaryMenuSection[] | undefined,
  supplementarySections: SecondaryMenuSection[] | undefined
): SecondaryMenuSection[] | undefined => {
  if (sections?.length && supplementarySections?.length) {
    return [...sections, ...supplementarySections];
  }

  return supplementarySections?.length ? supplementarySections : sections;
};

/**
 * Sections shown in the hover popover. Supplementary sections follow structural sections.
 */
export const getPopoverSections = (item: MenuItem): SecondaryMenuSection[] | undefined =>
  appendSupplementarySections(item.sections, item.supplementarySections);

/**
 * Sections shown in the expanded side panel. Supplementary sections are appended only when the item
 * has structural sections, so supplementary content cannot create a side panel by itself.
 */
export const getSidePanelSections = (item: MenuItem): SecondaryMenuSection[] | undefined => {
  if (!item.sections) {
    return undefined;
  }

  return appendSupplementarySections(item.sections, item.supplementarySections);
};
