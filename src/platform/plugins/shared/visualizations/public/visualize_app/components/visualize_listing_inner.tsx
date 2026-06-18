/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  ContentList,
  ContentListFooter,
  ContentListTable,
  ContentListToolbar,
  type ContentListItem,
} from '@kbn/content-list';
import { useContentListConfig } from '@kbn/content-list-provider';
import { getCustomColumn, getNoItemsMessage } from '@kbn/visualization-listing-components';
import type { VisualizationListItem } from '@kbn/visualization-listing-components';
import { DashboardFlowCallout } from './dashboard_flow_callout';
import { VisualizeTypeFilter } from './visualize_type_filter';

const { Column, Action } = ContentListTable;
const { Filters } = ContentListToolbar;

const visualizeLibraryPageTitle = i18n.translate('visualizations.listingPageTitle', {
  defaultMessage: 'Visualize library',
});

export interface VisualizeListingInnerProps {
  /** Invoked from the empty-state CTA. Page owns the new-vis modal lifecycle. */
  onCreateNewVis: () => void;
}

/**
 * Pure composition layer for the visualize listing tab. Renders the dashboard
 * flow callout, the `<ContentList>` tree, and the seeded sort / filter
 * affordances.
 *
 * Reads its only behaviour-bearing handler — the row-level edit callback —
 * out of `useContentListConfig()` so the provider is the single source of
 * truth for who is allowed to do what; the only prop it accepts is the
 * empty-state CTA, which is wired at page level alongside the new-vis modal
 * ref and so cannot live on the provider's `item` config.
 */
export const VisualizeListingInner = ({ onCreateNewVis }: VisualizeListingInnerProps) => {
  const { item: itemConfig } = useContentListConfig();
  const onEditItem = itemConfig?.actions?.edit?.onItemAction;

  const customTypeColumn = useMemo(() => getCustomColumn(), []);
  const renderTypeCell = useCallback(
    (contentItem: ContentListItem) => (
      <>{customTypeColumn.render('typeTitle', contentItem as VisualizationListItem)}</>
    ),
    [customTypeColumn]
  );

  const emptyState = useMemo(() => getNoItemsMessage(onCreateNewVis), [onCreateNewVis]);

  return (
    <>
      <DashboardFlowCallout />
      <ContentList emptyState={emptyState}>
        <ContentListToolbar>
          <Filters>
            <Filters.Tags />
            <VisualizeTypeFilter />
            <Filters.Sort />
          </Filters>
        </ContentListToolbar>
        <ContentListTable title={visualizeLibraryPageTitle}>
          <Column.Name showDescription showTags onClick={onEditItem} />
          <Column
            id="typeTitle"
            name={customTypeColumn.name}
            field="typeTitle"
            sortable
            width="11em"
            truncateText
            render={renderTypeCell}
          />
          <Column.UpdatedAt />
          <Column.Actions>
            <Action.ContentEditor />
            <Action.Edit />
            <Action.Delete />
          </Column.Actions>
        </ContentListTable>
        <ContentListFooter />
      </ContentList>
    </>
  );
};
