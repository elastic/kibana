/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { toAsCodeTags } from '@kbn/as-code-shared-transforms';
import type { SavedObjectReference } from '@kbn/core/server';
import type { DiscoverSessionAttributes } from '@kbn/saved-search-plugin/server';
import { getDiscoverSessionTab } from '../../../common/api/converters';
import type { DiscoverSessionApiData, DiscoverSessionWarning } from '../schema';
import { transformControlPanelsOut } from './transform_control_panels';

export const transformDiscoverSessionOut = (
  attributes: DiscoverSessionAttributes,
  references: SavedObjectReference[] = []
): { sessionState: DiscoverSessionApiData; warnings: DiscoverSessionWarning[] } => {
  const { tags } = toAsCodeTags(references);
  const warnings: DiscoverSessionWarning[] = [];
  const sessionState: DiscoverSessionApiData = {
    title: attributes.title,
    description: attributes.description,
    tags,
    tabs: attributes.tabs.map((tab) => {
      const { panels: controlPanels, warnings: controlPanelWarnings } = transformControlPanelsOut(
        tab.attributes.controlGroupJson,
        tab.id
      );
      const { apiTab, warnings: tabWarnings } = getDiscoverSessionTab({
        tab,
        references,
        controlPanels,
      });
      warnings.push(...controlPanelWarnings, ...tabWarnings);

      return apiTab;
    }),
  };

  return { sessionState, warnings };
};
