/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import type { DataView } from '@kbn/data-views-plugin/public';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiSpacer,
  EuiPortal,
  EuiPagination,
  keys,
} from '@elastic/eui';
import type { Filter, Query, AggregateQuery } from '@kbn/es-query';
import type { DataTableRecord } from '@kbn/discover-utils/types';
import type { DocViewFilterFn } from '@kbn/unified-doc-viewer/types';
import { UnifiedDocViewer } from '@kbn/unified-doc-viewer-plugin/public';
import { useDiscoverServices } from '../../hooks/use_discover_services';
import { isTextBasedQuery } from '../../application/main/utils/is_text_based_query';
import { useFlyoutActions } from './use_flyout_actions';
import { useDiscoverCustomization } from '../../customizations';

export interface DiscoverGridFlyoutProps {
  savedSearchId?: string;
  filters?: Filter[];
  query?: Query | AggregateQuery;
  columns: string[];
  columnTypes?: Record<string, string>;
  hit: DataTableRecord;
  hits?: DataTableRecord[];
  dataView: DataView;
  onAddColumn: (column: string) => void;
  onClose: () => void;
  onFilter?: DocViewFilterFn;
  onRemoveColumn: (column: string) => void;
  setExpandedDoc: (doc?: DataTableRecord) => void;
}

function getIndexByDocId(hits: DataTableRecord[], id: string) {
  return hits.findIndex((h) => {
    return h.id === id;
  });
}
/**
 * Flyout displaying an expanded Elasticsearch document
 */
export function DiscoverGridFlyout({
  hit,
  hits,
  dataView,
  columns,
  columnTypes,
  savedSearchId,
  filters,
  query,
  onFilter,
  onClose,
  onRemoveColumn,
  onAddColumn,
  setExpandedDoc,
}: DiscoverGridFlyoutProps) {
  const services = useDiscoverServices();
  const flyoutCustomization = useDiscoverCustomization('flyout');

  const isPlainRecord = isTextBasedQuery(query);
  // Get actual hit with updated highlighted searches
  const actualHit = useMemo(() => hits?.find(({ id }) => id === hit?.id) || hit, [hit, hits]);
  const pageCount = useMemo<number>(() => (hits ? hits.length : 0), [hits]);
  const activePage = useMemo<number>(() => {
    const id = hit.id;
    if (!hits || pageCount <= 1) {
      return -1;
    }

    return getIndexByDocId(hits, id);
  }, [hits, hit, pageCount]);

  const setPage = useCallback(
    (index: number) => {
      if (hits && hits[index]) {
        setExpandedDoc(hits[index]);
      }
    },
    [hits, setExpandedDoc]
  );

  const onKeyDown = useCallback(
    (ev: React.KeyboardEvent) => {
      if (ev.key === keys.ARROW_LEFT || ev.key === keys.ARROW_RIGHT) {
        ev.preventDefault();
        ev.stopPropagation();
        setPage(activePage + (ev.key === keys.ARROW_RIGHT ? 1 : -1));
      }
    },
    [activePage, setPage]
  );

  const { flyoutActions } = useFlyoutActions({
    actions: flyoutCustomization?.actions,
    dataView,
    rowIndex: hit.raw._index,
    rowId: hit.raw._id,
    columns,
    filters,
    savedSearchId,
  });

  const addColumn = useCallback(
    (columnName: string) => {
      onAddColumn(columnName);
      services.toastNotifications.addSuccess(
        i18n.translate('discover.grid.flyout.toastColumnAdded', {
          defaultMessage: `Column '{columnName}' was added`,
          values: { columnName },
        })
      );
    },
    [onAddColumn, services.toastNotifications]
  );

  const removeColumn = useCallback(
    (columnName: string) => {
      onRemoveColumn(columnName);
      services.toastNotifications.addSuccess(
        i18n.translate('discover.grid.flyout.toastColumnRemoved', {
          defaultMessage: `Column '{columnName}' was removed`,
          values: { columnName },
        })
      );
    },
    [onRemoveColumn, services.toastNotifications]
  );

  const renderDefaultContent = useCallback(
    () => (
      <UnifiedDocViewer
        columns={columns}
        columnTypes={columnTypes}
        dataView={dataView}
        filter={onFilter}
        hit={actualHit}
        onAddColumn={addColumn}
        onRemoveColumn={removeColumn}
        textBasedHits={isPlainRecord ? hits : undefined}
      />
    ),
    [
      actualHit,
      addColumn,
      columns,
      columnTypes,
      dataView,
      hits,
      isPlainRecord,
      onFilter,
      removeColumn,
    ]
  );

  const contentActions = useMemo(
    () => ({
      addFilter: onFilter,
      addColumn,
      removeColumn,
    }),
    [onFilter, addColumn, removeColumn]
  );

  const bodyContent = flyoutCustomization?.Content ? (
    <flyoutCustomization.Content
      actions={contentActions}
      doc={actualHit}
      renderDefaultContent={renderDefaultContent}
    />
  ) : (
    renderDefaultContent()
  );

  const defaultFlyoutTitle = isPlainRecord
    ? i18n.translate('discover.grid.tableRow.textBasedDetailHeading', {
        defaultMessage: 'Expanded row',
      })
    : i18n.translate('discover.grid.tableRow.detailHeading', {
        defaultMessage: 'Expanded document',
      });
  const flyoutTitle = flyoutCustomization?.title ?? defaultFlyoutTitle;

  const flyoutSize = flyoutCustomization?.size ?? 'm';

  return (
    <EuiPortal>
      <EuiFlyout
        onClose={onClose}
        size={flyoutSize}
        data-test-subj="docTableDetailsFlyout"
        onKeyDown={onKeyDown}
        ownFocus={false}
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle
            size="s"
            className="unifiedDataTable__flyoutHeader"
            data-test-subj="docTableRowDetailsTitle"
          >
            <h2>{flyoutTitle}</h2>
          </EuiTitle>
          <EuiSpacer size="s" />
          <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
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
        </EuiFlyoutHeader>
        <EuiFlyoutBody>{bodyContent}</EuiFlyoutBody>
      </EuiFlyout>
    </EuiPortal>
  );
}

// eslint-disable-next-line import/no-default-export
export default DiscoverGridFlyout;
