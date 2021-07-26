/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { usePager } from './lib/use_pager';
import { DocTableRow } from './components/table_row';
import { ToolBarPagination } from './components/pager/tool_bar_pagination';

export interface DocTableEmbeddableProps {
  totalHitCount: number;
  rows: DocTableRow[];
  sampleSize: number;
  renderRows: (row: DocTableRow[]) => JSX.Element[];
  renderHeader: () => JSX.Element;
}

export const DocTableEmbeddable = (props: DocTableEmbeddableProps) => {
  const pager = usePager({ totalItems: props.rows.length });

  const pageOfItems = useMemo(
    () => props.rows.slice(pager.startIndex, pager.pageSize + pager.startIndex),
    [pager.pageSize, pager.startIndex, props.rows]
  );

  const shouldShowLimitedResultsWarning = () =>
    !pager.hasNextPage && props.rows.length < props.totalHitCount;

  const onPageSizeChange = (size: number) => pager.onPageSizeChange(size);

  return (
    <Fragment>
      <div className="kuiBar kbnDocTable__bar">
        <EuiFlexGroup
          justifyContent="flexEnd"
          alignItems="center"
          gutterSize="xs"
          responsive={false}
          wrap={true}
        >
          {shouldShowLimitedResultsWarning() && (
            <EuiFlexItem grow={false}>
              <EuiText grow={false} size="s" color="subdued">
                <FormattedMessage
                  id="discover.docTable.limitedSearchResultLabel"
                  defaultMessage="Limited to {resultCount} results. Refine your search."
                  values={{ resultCount: props.sampleSize }}
                />
              </EuiText>
            </EuiFlexItem>
          )}
          <EuiFlexItem grow={false} data-test-subj="toolBarTotalDocsText">
            <EuiText grow={false} size="s">
              <FormattedMessage
                id="discover.docTable.totalDocuments"
                defaultMessage="{totalDocuments} documents"
                values={{
                  totalDocuments: <strong>{props.totalHitCount}</strong>,
                }}
              />
            </EuiText>
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
      <div className="kbnDocTable__container kbnDocTable__padBottom">
        <table className="kbnDocTable table" data-test-subj="docTable">
          <thead>{props.renderHeader()}</thead>
          <tbody>{props.renderRows(pageOfItems)}</tbody>
        </table>
      </div>
      <div className="kuiBar kbnDocTable__bar--footer">
        <ToolBarPagination
          pageSize={pager.pageSize}
          pageCount={pager.totalPages}
          activePage={pager.currentPage}
          onPageClick={pager.onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </div>
    </Fragment>
  );
};
