/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment, useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiPagination } from '@elastic/eui';
import { ToolBarPagerText } from './components/pager/tool_bar_pager_text';
import { PAGE_SIZE, usePager } from './lib/use_pager';
import { DocTableRow } from './components/table_row';

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
    () => props.rows.slice(pager.startIndex, PAGE_SIZE + pager.startIndex),
    [pager.startIndex, props.rows]
  );

  const shouldShowLimitedResultsWarning = () =>
    !pager.hasNextPage && props.rows.length < props.totalHitCount;

  const limitedResultsWarning = (
    <FormattedMessage
      id="discover.docTable.limitedSearchResultLabel"
      defaultMessage="Limited to {resultCount} results. Refine your search."
      values={{ resultCount: props.sampleSize }}
    />
  );

  const pagerToolbar = (
    <div className="kuiBarSection">
      {shouldShowLimitedResultsWarning() && (
        <div className="kuiToolBarText kuiSubduedText">{limitedResultsWarning}</div>
      )}
      <ToolBarPagerText
        startItem={pager.startItem}
        endItem={pager.endItem}
        totalItems={props.totalHitCount}
      />
      <EuiPagination
        aria-label={i18n.translate('discover.docTable.documentsNavigation', {
          defaultMessage: 'Documents navigation',
        })}
        pageCount={pager.totalPages}
        activePage={pager.currentPage}
        onPageClick={pager.onPageChange}
        compressed
      />
    </div>
  );

  return (
    <Fragment>
      <div className="kuiBar kbnDocTable__bar">{pagerToolbar}</div>
      <div className="kbnDocTable__container kbnDocTable__padBottom">
        <table className="kbnDocTable table" data-test-subj="docTable">
          <thead>{props.renderHeader()}</thead>
          <tbody>{props.renderRows(pageOfItems)}</tbody>
        </table>
      </div>
      <div className="kuiBar kbnDocTable__bar--footer">{pagerToolbar}</div>
    </Fragment>
  );
};
