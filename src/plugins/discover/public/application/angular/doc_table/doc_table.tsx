/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Fragment, memo, useCallback, useRef, useState } from 'react';
import './index.scss';
import { EuiButtonEmpty, EuiIcon, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import { TableHeader } from './components/table_header/table_header';
import { DOC_HIDE_TIME_COLUMN_SETTING, SORT_DEFAULT_ORDER_SETTING } from '../../../../common';
import { getServices, IndexPattern } from '../../../kibana_services';
import { UI_SETTINGS } from '../../../../../data/public';
import { SortOrder } from './components/table_header/helpers';
import { DocTableRow, TableRow } from './components/table_row';
import { DocViewFilterFn } from '../../doc_views/doc_views_types';
import { DocTableEmbeddable } from './doc_table_embeddable';
import { DocTableInfinite } from './doc_table_infinite';
import { SkipBottomButton } from '../../apps/main/components/skip_bottom_button';

export interface DocTableProps {
  /**
   * Columns of classic table
   */
  columns: string[];
  /**
   * Rows of classic table
   */
  rows: DocTableRow[];
  /**
   * Type of classic table
   */
  type: 'infinite' | 'embeddable' | 'context';
  /**
   * Current IndexPattern
   */
  indexPattern: IndexPattern;
  /**
   * Max count of rows to be able to load. Used only for 'infinite' table
   */
  sampleSize?: number;
  /**
   * Current sorting
   */
  sort: string[][];
  /**
   * Total rows count. Used only for 'embeddable' table
   */
  totalHitCount?: number;
  /**
   * Visible rows on first render. Used only for 'infinite' table
   */
  minimumVisibleRows?: number;
  /**
   * New fields api switch
   */
  useNewFieldsApi: boolean;
  /**
   * Current search description
   */
  searchDescription?: string;
  /**
   * Current shared item title
   */
  sharedItemTitle?: string;
  /**
   * Current data test subject
   */
  dataTestSubj: string;
  /**
   * Loading state
   */
  isLoading: boolean;
  /**
   * Filter callback
   */
  onFilter: DocViewFilterFn;
  /**
   * Sorting callback
   */
  onSort?: (sort: string[][]) => void;
  /**
   * Add columns callback
   */
  onAddColumn?: (column: string) => void;
  /**
   * Reordering column callback
   */
  onMoveColumn?: (columns: string, newIdx: number) => void;
  /**
   * Remove column callback
   */
  onRemoveColumn?: (column: string) => void;
}

const DocTableEmbeddableMemoized = memo(DocTableEmbeddable);
const DocTableInfiniteMemoized = memo(DocTableInfinite);

export const DocTable = ({
  columns,
  rows,
  type,
  totalHitCount,
  indexPattern,
  onSort,
  onAddColumn,
  onMoveColumn,
  onRemoveColumn,
  sort,
  onFilter,
  useNewFieldsApi,
  sampleSize,
  searchDescription,
  sharedItemTitle,
  dataTestSubj,
  isLoading,
}: DocTableProps) => {
  const scrollableDesktop = useRef<HTMLDivElement>(null);
  const [minimumVisibleRows, setMinimumVisibleRows] = useState(50);
  const { uiSettings } = getServices();
  const defaultSortOrder = uiSettings.get(SORT_DEFAULT_ORDER_SETTING, 'desc');
  const hideTimeColumn = uiSettings.get(DOC_HIDE_TIME_COLUMN_SETTING, false);
  const isShortDots = uiSettings.get(UI_SETTINGS.SHORT_DOTS_ENABLE);

  const onSkipBottomButtonClick = useCallback(async () => {
    // delay scrolling to after the rows have been rendered
    const bottomMarker = document.getElementById('discoverBottomMarker');
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    // show all the rows
    setMinimumVisibleRows(rows.length);

    while (rows.length !== document.getElementsByClassName('kbnDocTable__row').length) {
      await wait(50);
    }
    bottomMarker!.focus();
    await wait(50);
    bottomMarker!.blur();
  }, [setMinimumVisibleRows, rows]);

  const onBackToTop = useCallback(() => {
    if (scrollableDesktop && scrollableDesktop.current) {
      scrollableDesktop.current.focus();
    }
    const isMobileView = document.getElementsByClassName('dscSidebar__mobile').length > 0;
    // Only the desktop one needs to target a specific container
    if (!isMobileView && scrollableDesktop.current) {
      scrollableDesktop.current.scrollTo(0, 0);
    } else if (window) {
      window.scrollTo(0, 0);
    }
  }, []);

  const renderHeader = useCallback(
    () => (
      <TableHeader
        columns={columns}
        defaultSortOrder={defaultSortOrder}
        hideTimeColumn={hideTimeColumn}
        indexPattern={indexPattern}
        isShortDots={isShortDots}
        onChangeSortOrder={onSort}
        onMoveColumn={onMoveColumn}
        onRemoveColumn={onRemoveColumn}
        sortOrder={sort as SortOrder[]}
      />
    ),
    [
      columns,
      defaultSortOrder,
      hideTimeColumn,
      indexPattern,
      isShortDots,
      onMoveColumn,
      onRemoveColumn,
      onSort,
      sort,
    ]
  );

  const renderRows = useCallback(
    (rowsToRender: DocTableRow[]) => {
      return rowsToRender.map((current) => (
        <TableRow
          key={`${current._index}${current._type}${current._id}${current._score}${current._version}${current._routing}`}
          columns={columns}
          filter={onFilter}
          indexPattern={indexPattern}
          row={current}
          useNewFieldsApi={!!useNewFieldsApi}
          onAddColumn={onAddColumn}
          onRemoveColumn={onRemoveColumn}
        />
      ));
    },
    [columns, onFilter, indexPattern, onAddColumn, onRemoveColumn, useNewFieldsApi]
  );

  const commonProps = {
    columns,
    rows,
    indexPattern,
    onSort,
    onAddColumn,
    onMoveColumn,
    onRemoveColumn,
    useNewFieldsApi,
    defaultSortOrder,
    hideTimeColumn,
    isShortDots,
  };

  return (
    <div
      ref={scrollableDesktop}
      className="kbnDocTableWrapper eui-yScroll eui-xScroll"
      data-shared-item
      data-title={sharedItemTitle}
      data-description={searchDescription}
      data-test-subj={dataTestSubj}
      data-render-complete={!isLoading}
    >
      {!isLoading && rows && rows.length !== 0 && (
        <Fragment>
          <SkipBottomButton onClick={onSkipBottomButtonClick} />
          {type === 'infinite' && (
            <DocTableInfiniteMemoized
              {...commonProps}
              renderHeader={renderHeader}
              renderRows={renderRows}
              minimumVisibleRows={minimumVisibleRows || 50}
            />
          )}
          {type === 'embeddable' && (
            <DocTableEmbeddableMemoized
              {...commonProps}
              renderHeader={renderHeader}
              renderRows={renderRows}
              totalHitCount={totalHitCount!}
            />
          )}
          {type === 'context' && (
            <table className="kbn-table table" data-test-subj="docTable">
              <thead>{renderHeader()}</thead>
              <tbody>{renderRows(rows)}</tbody>
            </table>
          )}
          {rows.length === sampleSize ? (
            <div
              className="kbnDocTable__footer"
              data-test-subj="discoverDocTableFooter"
              tabIndex={-1}
              id="discoverBottomMarker"
            >
              <FormattedMessage
                id="discover.howToSeeOtherMatchingDocumentsDescription"
                defaultMessage="These are the first {sampleSize} documents matching
                  your search, refine your search to see others."
                values={{ sampleSize }}
              />
              <EuiButtonEmpty onClick={onBackToTop} data-test-subj="discoverBackToTop">
                <FormattedMessage id="discover.backToTopLinkText" defaultMessage="Back to top." />
              </EuiButtonEmpty>
            </div>
          ) : (
            <span tabIndex={-1} id="discoverBottomMarker">
              &#8203;
            </span>
          )}
        </Fragment>
      )}
      {rows && rows.length === 0 && (
        <div className="kbnDocTable__error">
          <EuiText size="xs" color="subdued">
            <EuiIcon type="visualizeApp" size="m" color="subdued" />
            <EuiSpacer size="m" />
            <FormattedMessage
              id="discover.docTable.noResultsTitle"
              defaultMessage="No results found"
            />
          </EuiText>
        </div>
      )}
    </div>
  );
};
