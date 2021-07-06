/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment, useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { SAMPLE_SIZE_SETTING } from '../../../../common';
import { getServices, IndexPattern } from '../../../kibana_services';
import { ToolBarPagerButtons } from './components/pager/tool_bar_pager_buttons';
import { ToolBarPagerText } from './components/pager/tool_bar_pager_text';
import { DocTableRow, TableRow } from './components/table_row/table_row';
import { usePager } from './lib/pager/usePager';
import { TableHeader } from './components/table_header/table_header';
import { SortOrder } from './components/table_header/helpers';
import { DocViewFilterFn } from '../../doc_views/doc_views_types';

interface DocTableEmbeddableProps {
  columns: string[];
  rows: DocTableRow[];
  totalHitCount: number;
  indexPattern: IndexPattern;
  onSort?: (sort: string[][]) => void;
  onAddColumn?: (column: string) => void;
  onMoveColumn?: (columns: string, newIdx: number) => void;
  onRemoveColumn?: (column: string) => void;
  sorting: string[][];
  filter: DocViewFilterFn;
  useNewFieldsApi?: boolean;
  defaultSortOrder: string;
  hideTimeColumn: boolean;
  isShortDots: boolean;
}

export const DocTableEmbeddable = (props: DocTableEmbeddableProps) => {
  const pager = usePager({ totalItems: props.totalHitCount, pageSize: 50, startingPage: 1 });

  const pageOfItems = useMemo(
    () => props.rows.slice(pager.startIndex, pager.pageSize + pager.startIndex),
    [pager.pageSize, pager.startIndex, props.rows]
  );

  const onPageNext = () => {
    pager.updateMeta({ currentPage: pager.currentPage + 1, totalItems: props.rows.length });
  };

  const onPagePrevious = () => {
    pager.updateMeta({ currentPage: pager.currentPage - 1, totalItems: props.rows.length });
  };

  const shouldShowLimitedResultsWarning = () =>
    !pager.hasNextPage && pager.totalItems < props.totalHitCount;

  const tableRows = pageOfItems.map((current) => {
    return (
      <TableRow
        key={`${current._index}${current._type}${current._id}${current._score}${current._version}${current._routing}`}
        columns={props.columns}
        filter={props.filter}
        indexPattern={props.indexPattern}
        row={current}
        useNewFieldsApi={!!props.useNewFieldsApi}
        onAddColumn={props.onAddColumn}
        onRemoveColumn={props.onRemoveColumn}
      />
    );
  });

  const limitedResultsWarning = (
    <FormattedMessage
      id="discover.docTable.limitedSearchResultLabel"
      defaultMessage="Limited to {resultCount} results. Refine your search."
      values={{ resultCount: getServices().uiSettings.get(SAMPLE_SIZE_SETTING, 500) }}
    />
  );

  return (
    <Fragment>
      <div className="kuiBar kbnDocTable__bar">
        <div className="kuiBarSection">
          {shouldShowLimitedResultsWarning() && (
            <div className="kuiToolBarText kuiSubduedText">{limitedResultsWarning}</div>
          )}
          <ToolBarPagerText
            startItem={pager.startItem}
            endItem={pager.endItem}
            totalItems={props.totalHitCount}
          />
          <ToolBarPagerButtons
            hasPreviousPage={pager.hasPreviousPage}
            hasNextPage={pager.hasNextPage}
            onPageNext={onPageNext}
            onPagePrevious={onPagePrevious}
          />
        </div>
      </div>
      <div className="kbnDocTable__container kbnDocTable__padBottom">
        <table className="kbnDocTable table" ng-if="indexPattern" data-test-subj="docTable">
          <thead>
            <TableHeader
              columns={props.columns}
              indexPattern={props.indexPattern}
              sortOrder={props.sorting as SortOrder[]}
              onChangeSortOrder={props.onSort}
              onMoveColumn={props.onMoveColumn}
              onRemoveColumn={props.onRemoveColumn}
              defaultSortOrder={props.defaultSortOrder}
              hideTimeColumn={props.hideTimeColumn}
              isShortDots={props.isShortDots}
            />
          </thead>
          <tbody>{tableRows}</tbody>
        </table>
      </div>
      <div className="kuiBar kbnDocTable__bar--footer">
        <div className="kuiBarSection">
          {shouldShowLimitedResultsWarning() && (
            <div className="kuiToolBarText kuiSubduedText">{limitedResultsWarning}</div>
          )}
          <ToolBarPagerText
            startItem={pager.startItem}
            endItem={pager.endItem}
            totalItems={props.totalHitCount}
          />
          <ToolBarPagerButtons
            hasPreviousPage={pager.hasPreviousPage}
            hasNextPage={pager.hasNextPage}
            onPageNext={onPageNext}
            onPagePrevious={onPagePrevious}
          />
        </div>
      </div>
    </Fragment>
  );
};
