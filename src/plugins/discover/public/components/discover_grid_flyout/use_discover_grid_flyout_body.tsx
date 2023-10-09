/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPagination, EuiSpacer, EuiTitle } from '@elastic/eui';
import { DataView } from '@kbn/data-views-plugin/common';
import { DataTableRecord } from '@kbn/discover-utils/types';
import { AggregateQuery, Filter, Query } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import { UnifiedDocViewer } from '@kbn/unified-doc-viewer-plugin/public';
import { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import React, { useMemo } from 'react';
import { isTextBasedQuery } from '../../application/main/utils/is_text_based_query';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { useFlyoutActions } from './use_flyout_actions';

export interface DiscoverGridFlyoutBodyProps {
  savedSearchId?: string;
  filters?: Filter[];
  query?: Query | AggregateQuery;
  columns: string[];
  columnTypes?: Record<string, string>;
  hit?: DataTableRecord;
  hits?: DataTableRecord[];
  dataView: DataView;
  activePage: number;
  onAddColumn: (column: string) => void;
  onFilter?: DocViewFilterFn;
  onRemoveColumn: (column: string) => void;
  setPage: (page: number) => void;
}

export const useDiscoverGridFlyoutBody = ({
  hit,
  hits,
  dataView,
  columns,
  columnTypes,
  savedSearchId,
  filters,
  query,
  activePage,
  onFilter,
  onRemoveColumn,
  onAddColumn,
  setPage,
}: DiscoverGridFlyoutBodyProps) => {
  const services = useDiscoverServices();
  const isPlainRecord = isTextBasedQuery(query);
  // Get actual hit with updated highlighted searches
  const actualHit = useMemo(() => hits?.find(({ id }) => id === hit?.id) || hit, [hit, hits]);
  const pageCount = useMemo<number>(() => (hits ? hits.length : 0), [hits]);

  const { flyoutActions } = useFlyoutActions({
    dataView,
    rowIndex: hit?.raw._index ?? '',
    rowId: hit?.raw._id ?? '',
    columns,
    filters,
    savedSearchId,
  });

  const header = actualHit && (
    <>
      <EuiTitle
        size="s"
        className="unifiedDataTable__flyoutHeader"
        data-test-subj="docTableRowDetailsTitle"
      >
        <h2>
          {isPlainRecord
            ? i18n.translate('discover.grid.tableRow.textBasedDetailHeading', {
                defaultMessage: 'Expanded row',
              })
            : i18n.translate('discover.grid.tableRow.detailHeading', {
                defaultMessage: 'Expanded document',
              })}
        </h2>
      </EuiTitle>

      <EuiSpacer size="s" />
      <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center" wrap={true}>
        {!isPlainRecord &&
          flyoutActions.map((action) => action.enabled && <action.Content key={action.id} />)}
        {activePage !== -1 && (
          <EuiFlexItem data-test-subj={`dscDocNavigationPage-${activePage}`}>
            <EuiPagination
              aria-label={i18n.translate('discover.grid.flyout.documentNavigation', {
                defaultMessage: 'Document navigation',
              })}
              pageCount={pageCount}
              activePage={activePage}
              onPageClick={setPage}
              className="unifiedDataTable__flyoutDocumentNavigation"
              compressed
              data-test-subj="dscDocNavigation"
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </>
  );

  const body = actualHit && (
    <UnifiedDocViewer
      hit={actualHit}
      columns={columns}
      columnTypes={columnTypes}
      dataView={dataView}
      filter={onFilter}
      onRemoveColumn={(columnName: string) => {
        onRemoveColumn(columnName);
        services.toastNotifications.addSuccess(
          i18n.translate('discover.grid.flyout.toastColumnRemoved', {
            defaultMessage: `Column '{columnName}' was removed`,
            values: { columnName },
          })
        );
      }}
      onAddColumn={(columnName: string) => {
        onAddColumn(columnName);
        services.toastNotifications.addSuccess(
          i18n.translate('discover.grid.flyout.toastColumnAdded', {
            defaultMessage: `Column '{columnName}' was added`,
            values: { columnName },
          })
        );
      }}
      textBasedHits={isPlainRecord ? hits : undefined}
    />
  );

  return { header, body };
};
