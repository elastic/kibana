/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo, useCallback } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiTitle,
  EuiButtonEmpty,
  EuiText,
  EuiSpacer,
  EuiPortal,
  EuiPagination,
} from '@elastic/eui';
import { DocViewer } from '../doc_viewer/doc_viewer';
import { IndexPattern } from '../../../kibana_services';
import { DocViewFilterFn, ElasticSearchHit } from '../../doc_views/doc_views_types';
import { DiscoverServices } from '../../../build_services';
import { getContextUrl } from '../../helpers/get_context_url';

interface Props {
  columns: string[];
  hit: ElasticSearchHit;
  hits?: ElasticSearchHit[];
  indexPattern: IndexPattern;
  onAddColumn: (column: string) => void;
  onClose: () => void;
  onFilter: DocViewFilterFn;
  onRemoveColumn: (column: string) => void;
  services: DiscoverServices;
  setExpandedDoc: (doc: ElasticSearchHit) => void;
}

function getDocFingerprintId(doc: ElasticSearchHit) {
  return [doc._index, doc._id].join('|');
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
  services,
  setExpandedDoc,
}: Props) {
  const pageCount = useMemo(() => hits && hits.length, [hits]);
  const activePage = useMemo(() => {
    const id = getDocFingerprintId(hit);
    if (!hits) {
      return -1;
    }

    return getIndexByDocId(hits, id);
  }, [hits, hit]);

  const setPage = useCallback(
    (pageIdx) => {
      if (hits && hits[pageIdx]) {
        setExpandedDoc(hits[pageIdx]);
      }
    },
    [hits, setExpandedDoc]
  );

  return (
    <EuiPortal>
      <EuiFlyout onClose={onClose} size="m" data-test-subj="docTableDetailsFlyout">
        <EuiFlyoutHeader hasBorder>
          <EuiFlexGroup responsive={false} gutterSize="m" alignItems="center">
            <EuiFlexItem grow={true}>
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
            </EuiFlexItem>
            {activePage !== -1 && (
              <EuiFlexItem grow={false}>
                <EuiPagination
                  aria-label="Custom pagination example"
                  pageCount={pageCount}
                  activePage={activePage}
                  onPageClick={setPage}
                  compressed
                />
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <EuiFlexGroup responsive={false} gutterSize="m" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiText size="s">
                <strong>
                  {i18n.translate('discover.grid.tableRow.viewText', {
                    defaultMessage: 'View:',
                  })}
                </strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="xs"
                iconType="document"
                href={services.addBasePath(
                  `#/doc/${indexPattern.id}/${hit._index}?id=${encodeURIComponent(
                    hit._id as string
                  )}`
                )}
                data-test-subj="docTableRowAction"
              >
                {i18n.translate('discover.grid.tableRow.viewSingleDocumentLinkTextSimple', {
                  defaultMessage: 'Single document',
                })}
              </EuiButtonEmpty>
            </EuiFlexItem>
            {indexPattern.isTimeBased() && indexPattern.id && (
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  size="xs"
                  iconType="documents"
                  href={getContextUrl(
                    hit._id,
                    indexPattern.id,
                    columns,
                    services.filterManager,
                    services.addBasePath
                  )}
                  data-test-subj="docTableRowAction"
                >
                  {i18n.translate('discover.grid.tableRow.viewSurroundingDocumentsLinkTextSimple', {
                    defaultMessage: 'Surrounding documents',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <DocViewer
            hit={hit}
            columns={columns}
            indexPattern={indexPattern}
            filter={(mapping, value, mode) => {
              onFilter(mapping, value, mode);
              onClose();
            }}
            onRemoveColumn={(columnName: string) => {
              onRemoveColumn(columnName);
              onClose();
            }}
            onAddColumn={(columnName: string) => {
              onAddColumn(columnName);
              onClose();
            }}
          />
        </EuiFlyoutBody>
      </EuiFlyout>
    </EuiPortal>
  );
}
