/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { toAsCodeTags } from '@kbn/as-code-shared-transforms';
import type { DiscoverSessionApiData, DiscoverSessionApiTab } from '@kbn/as-code-discover-schema';
import type { SavedObjectReference } from '@kbn/core/server';
import type { DiscoverSessionAttributes } from '@kbn/saved-search-plugin/server';
import { injectReferences, parseSearchSourceJSON } from '@kbn/data-plugin/common';
import type { SerializedSearchSourceFields } from '@kbn/data-plugin/common';
import { isOfAggregateQueryType } from '@kbn/es-query';
import type { DiscoverSessionWarning } from '../schema';
import { transformControlPanelsOut } from './transform_control_panels';
import {
  applySessionTabTypeState,
  fromStoredSessionSearchAndTable,
  fromStoredClassicSessionSettings,
  fromStoredEsqlSessionSettings,
} from '../../../common/session/session_tab_mapping';
import { isDiscoverSessionEsqlTab } from '../../../common/session/type_guards';
import { toApiVisContext } from '../../../common/session/vis_context';

interface ConvertedSessionTab {
  tab: DiscoverSessionApiTab;
  warnings: DiscoverSessionWarning[];
}

/** Builds API session data, preserving valid controls and collecting warnings for omitted ones. */
export const transformDiscoverSessionOut = (
  attributes: DiscoverSessionAttributes,
  references: SavedObjectReference[] = []
): { sessionState: DiscoverSessionApiData; warnings: DiscoverSessionWarning[] } => {
  const convertedTabs = attributes.tabs.map((storedTab) =>
    fromStoredSessionTab(storedTab, references)
  );

  return assembleApiSession(attributes, references, convertedTabs);
};

/** Reads the SearchSource, resolving references only for classic tabs. */
const readSessionSearchSource = (
  tab: DiscoverSessionAttributes['tabs'][number],
  references: SavedObjectReference[]
): SerializedSearchSourceFields => {
  const searchSource = parseSearchSourceJSON(tab.attributes.kibanaSavedObjectMeta.searchSourceJSON);

  // ES|QL does not use Data View or filter references from the stored SearchSource.
  if (isOfAggregateQueryType(searchSource.query)) {
    return searchSource;
  }

  return injectReferences(searchSource, references);
};

/** Converts a stored tab to API data, including its settings, chart, controls, and tab type. */
const fromStoredSessionTab = (
  tab: DiscoverSessionAttributes['tabs'][number],
  references: SavedObjectReference[]
): ConvertedSessionTab => {
  const searchSource = readSessionSearchSource(tab, references);
  const searchAndTableFields = fromStoredSessionSearchAndTable(tab.attributes, searchSource);
  const sessionSettings = isDiscoverSessionEsqlTab(searchAndTableFields)
    ? fromStoredEsqlSessionSettings(tab.attributes)
    : fromStoredClassicSessionSettings(tab.attributes);
  const apiTab = {
    ...searchAndTableFields,
    ...sessionSettings,
  };
  const visContext = toApiVisContext(tab.attributes.visContext);
  const { panels: controlPanels, warnings } = transformControlPanelsOut(
    tab.attributes.controlGroupJson,
    tab.id
  );
  const sessionTab = {
    id: tab.id,
    label: tab.label,
    ...apiTab,
    ...(visContext !== undefined && { vis_context: visContext }),
    ...(controlPanels !== undefined && { control_panels: controlPanels }),
  };
  const typedTab = applySessionTabTypeState(sessionTab, tab.attributes.tabTypeState);

  return { tab: typedTab, warnings };
};

/** Combines converted tabs and their warnings in the original tab order. */
const assembleApiSession = (
  { title, description }: DiscoverSessionAttributes,
  references: SavedObjectReference[],
  convertedTabs: ConvertedSessionTab[]
): { sessionState: DiscoverSessionApiData; warnings: DiscoverSessionWarning[] } => {
  const { tags } = toAsCodeTags(references);
  const sessionState = {
    title,
    description,
    tags,
    tabs: convertedTabs.map(({ tab }) => tab),
  };
  const warnings = convertedTabs.flatMap((tab) => tab.warnings);

  return { sessionState, warnings };
};
