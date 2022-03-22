/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import type { DataView } from 'src/plugins/data_views/public';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiIconTip,
  EuiTitle,
  EuiButtonEmpty,
  EuiText,
  EuiSpacer,
  EuiPortal,
  EuiPagination,
  EuiHideFor,
  keys,
} from '@elastic/eui';
import { DocViewer } from '../../services/doc_views/components/doc_viewer/doc_viewer';
import { DocViewFilterFn } from '../../services/doc_views/doc_views_types';
import { useNavigationProps } from '../../utils/use_navigation_props';
import { ElasticSearchHit } from '../../types';
import { useDiscoverServices } from '../../utils/use_discover_services';

export interface DiscoverGridFlyoutProps {
  columns: string[];
  hit: ElasticSearchHit;
  hits?: ElasticSearchHit[];
  indexPattern: DataView;
  onAddColumn: (column: string) => void;
  onClose: () => void;
  onFilter: DocViewFilterFn;
  onRemoveColumn: (column: string) => void;
  setExpandedDoc: (doc: ElasticSearchHit) => void;
}

type ElasticSearchHitWithRouting = ElasticSearchHit & { _routing?: string };

function getDocFingerprintId(doc: ElasticSearchHitWithRouting) {
  const routing = doc._routing || '';
  return [doc._index, doc._id, routing].join('||');
}

function getIndexByDocId(hits: ElasticSearchHit[], id: string) {
  return hits.findIndex((h) => {
    return getDocFingerprintId(h) === id;
  });
}
/**
 * Flyout displaying an expanded Elasticsearch document
 */
export function DiscoverGridFlyout({
  hit,
  hits,
  indexPattern,
  columns,
  onFilter,
  onClose,
  onRemoveColumn,
  onAddColumn,
  setExpandedDoc,
}: DiscoverGridFlyoutProps) {
  const services = useDiscoverServices();
  // Get actual hit with updated highlighted searches
  const actualHit = useMemo(() => hits?.find(({ _id }) => _id === hit?._id) || hit, [hit, hits]);
  const pageCount = useMemo<number>(() => (hits ? hits.length : 0), [hits]);
  const activePage = useMemo<number>(() => {
    const id = getDocFingerprintId(hit);
    if (!hits || pageCount <= 1) {
      return -1;
    }

    return getIndexByDocId(hits, id);
  }, [hits, hit, pageCount]);

  const setPage = useCallback(
    (pageIdx: number) => {
      if (hits && hits[pageIdx]) {
        setExpandedDoc(hits[pageIdx]);
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

  const { singleDocProps, surrDocsProps } = useNavigationProps({
    indexPatternId: indexPattern.id!,
    rowIndex: hit._index,
    rowId: hit._id,
    filterManager: services.filterManager,
    addBasePath: services.addBasePath,
    columns,
  });

  return (
    <EuiPortal>
      <EuiFlyout
        onClose={onClose}
        size="m"
        data-test-subj="docTableDetailsFlyout"
        onKeyDown={onKeyDown}
        ownFocus={false}
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle
            size="s"
            className="dscTable__flyoutHeader"
            data-test-subj="docTableRowDetailsTitle"
          >
            <h2>
              {i18n.translate('discover.grid.tableRow.detailHeading', {
                defaultMessage: 'Expanded document',
              })}
            </h2>
          </EuiTitle>

          <EuiSpacer size="s" />
          <EuiFlexGroup responsive={false} gutterSize="s" alignItems="center">
            <EuiHideFor sizes={['xs', 's', 'm']}>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <strong>
                    {i18n.translate('discover.grid.tableRow.viewText', {
                      defaultMessage: 'View:',
                    })}
                  </strong>
                </EuiText>
              </EuiFlexItem>
            </EuiHideFor>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                iconSize="s"
                iconType="document"
                flush="left"
                data-test-subj="docTableRowAction"
                {...singleDocProps}
              >
                {i18n.translate('discover.grid.tableRow.viewSingleDocumentLinkTextSimple', {
                  defaultMessage: 'Single document',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            {indexPattern.isTimeBased() && indexPattern.id && (
              <EuiFlexGroup alignItems="center" responsive={false} gutterSize="none">
                <EuiFlexItem grow={false}>
                  <EuiButtonEmpty
                    size="s"
                    iconSize="s"
                    iconType="documents"
                    flush="left"
                    {...surrDocsProps}
                    data-test-subj="docTableRowAction"
                  >
                    {i18n.translate(
                      'discover.grid.tableRow.viewSurroundingDocumentsLinkTextSimple',
                      {
                        defaultMessage: 'Surrounding documents',
                      }
                    )}
                  </EuiButtonEmpty>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIconTip
                    content={i18n.translate(
                      'discover.grid.tableRow.viewSurroundingDocumentsHover',
                      {
                        defaultMessage:
                          'Inspect documents that occurred before and after this document. Only pinned filters remain active in the Surrounding documents view.',
                      }
                    )}
                    type="questionInCircle"
                    color="subdued"
                    position="right"
                    iconProps={{
                      className: 'eui-alignTop',
                    }}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            )}
            {activePage !== -1 && (
              <EuiFlexItem data-test-subj={`dscDocNavigationPage-${activePage}`}>
                <EuiPagination
                  aria-label={i18n.translate('discover.grid.flyout.documentNavigation', {
                    defaultMessage: 'Document navigation',
                  })}
                  pageCount={pageCount}
                  activePage={activePage}
                  onPageClick={setPage}
                  className="dscTable__flyoutDocumentNavigation"
                  compressed
                  data-test-subj="dscDocNavigation"
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <DocViewer
            hit={actualHit}
            columns={columns}
            indexPattern={indexPattern}
            filter={(mapping, value, mode) => {
              onFilter(mapping, value, mode);
              services.toastNotifications.addSuccess(
                i18n.translate('discover.grid.flyout.toastFilterAdded', {
                  defaultMessage: `Filter was added`,
                })
              );
            }}
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
          />
        </EuiFlyoutBody>
      </EuiFlyout>
    </EuiPortal>
  );
}
