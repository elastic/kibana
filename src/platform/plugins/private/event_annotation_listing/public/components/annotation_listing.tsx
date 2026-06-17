/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React, { useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import {
  ContentList,
  ContentListFooter,
  ContentListTable,
  ContentListToolbar,
} from '@kbn/content-list';
import { useContentListConfig, type ContentListItem } from '@kbn/content-list-provider';
import { EmptyPrompt } from './empty_prompt';
import { DataViewCell } from './data_view_cell';

const { Column, Action } = ContentListTable;

const tableTitle = i18n.translate('eventAnnotationListing.tableList.listTitle', {
  defaultMessage: 'Annotation Library',
});

const dataViewColumnName = i18n.translate('eventAnnotationListing.tableList.dataView', {
  defaultMessage: 'Data view',
});

export interface EventAnnotationListingProps {
  /** Invoked when the empty-state CTA is clicked. */
  onCreateAnnotation: () => void;
  /** Lookup of `dataViewId` → display name, passed through to `DataViewCell`. */
  dataViewNameMap: Record<string, string>;
  /** Caps the name column width when the listing uses restricted table layout. */
  titleColumnMaxWidth?: string;
}

/**
 * Pure composition layer for the annotation-groups listing. Renders the
 * `<ContentList>` tree (toolbar, table, columns, footer) and the empty state.
 *
 * Everything that needs services, handlers, or shared config reads it from
 * `ContentListClientProvider`'s context; this component therefore takes only
 * the two props the composition itself owns and never the kind of giant
 * services bag that the listing previously had to thread end-to-end.
 */
export const EventAnnotationListing = ({
  onCreateAnnotation,
  dataViewNameMap,
  titleColumnMaxWidth,
}: EventAnnotationListingProps) => {
  const { item: itemConfig } = useContentListConfig();
  const onEditItem = itemConfig?.actions?.edit?.onItemAction;

  const renderDataViewCell = useCallback(
    (item: ContentListItem) => <DataViewCell item={item} dataViewNameMap={dataViewNameMap} />,
    [dataViewNameMap]
  );

  return (
    <ContentList emptyState={<EmptyPrompt onCreateClick={onCreateAnnotation} />}>
      <ContentListToolbar />
      <ContentListTable title={tableTitle}>
        <Column.Name
          showDescription
          showTags
          onClick={onEditItem}
          {...(titleColumnMaxWidth
            ? { maxWidth: titleColumnMaxWidth, width: titleColumnMaxWidth }
            : {})}
        />
        <Column
          id="dataView"
          name={dataViewColumnName}
          field="indexPatternId"
          width="15em"
          render={renderDataViewCell}
        />
        <Column.UpdatedAt />
        <Column.Actions>
          <Action.Edit />
          <Action.Delete />
        </Column.Actions>
      </ContentListTable>
      <ContentListFooter />
    </ContentList>
  );
};
