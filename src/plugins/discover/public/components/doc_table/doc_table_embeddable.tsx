/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { memo, useCallback, useMemo, useRef } from 'react';
import './index.scss';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { SAMPLE_SIZE_SETTING } from '../../../common';
import { usePager } from '../../utils/use_pager';
import { ToolBarPagination } from './components/pager/tool_bar_pagination';
import { DocTableProps, DocTableRenderProps, DocTableWrapper } from './doc_table_wrapper';
import { TotalDocuments } from '../../application/main/components/total_documents/total_documents';
import { useDiscoverServices } from '../../utils/use_discover_services';

export interface DocTableEmbeddableProps extends DocTableProps {
  totalHitCount: number;
}

const DocTableWrapperMemoized = memo(DocTableWrapper);

export const DocTableEmbeddable = (props: DocTableEmbeddableProps) => {
  const services = useDiscoverServices();
  const tableWrapperRef = useRef<HTMLDivElement>(null);
  const {
    curPageIndex,
    pageSize,
    totalPages,
    startIndex,
    hasNextPage,
    changePageIndex,
    changePageSize,
  } = usePager({
    initialPageSize: 50,
    totalItems: props.rows.length,
  });
  const showPagination = totalPages !== 0;

  const scrollTop = useCallback(() => {
    if (tableWrapperRef.current) {
      tableWrapperRef.current.scrollTo(0, 0);
    }
  }, []);

  const pageOfItems = useMemo(
    () => props.rows.slice(startIndex, pageSize + startIndex),
    [pageSize, startIndex, props.rows]
  );

  const onPageChange = useCallback(
    (page: number) => {
      scrollTop();
      changePageIndex(page);
    },
    [changePageIndex, scrollTop]
  );

  const onPageSizeChange = useCallback(
    (size: number) => {
      scrollTop();
      changePageSize(size);
    },
    [changePageSize, scrollTop]
  );

  const shouldShowLimitedResultsWarning = useMemo(
    () => !hasNextPage && props.rows.length < props.totalHitCount,
    [hasNextPage, props.rows.length, props.totalHitCount]
  );

  const sampleSize = useMemo(() => {
    return services.uiSettings.get(SAMPLE_SIZE_SETTING, 500);
  }, [services]);

  const renderDocTable = useCallback(
    (renderProps: DocTableRenderProps) => {
      return (
        <div className="kbnDocTable__container">
          <table className="kbnDocTable table" data-test-subj="docTable">
            <thead>{renderProps.renderHeader()}</thead>
            <tbody>{renderProps.renderRows(pageOfItems)}</tbody>
          </table>
        </div>
      );
    },
    [pageOfItems]
  );

  return (
    <EuiFlexGroup style={{ width: '100%' }} direction="column" gutterSize="xs" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          justifyContent="flexEnd"
          alignItems="center"
          gutterSize="xs"
          responsive={false}
          wrap={true}
        >
          {shouldShowLimitedResultsWarning && (
            <EuiFlexItem grow={false}>
              <EuiText grow={false} size="s" color="subdued">
                <FormattedMessage
                  id="discover.docTable.limitedSearchResultLabel"
                  defaultMessage="Limited to {resultCount} results. Refine your search."
                  values={{ resultCount: sampleSize }}
                />
              </EuiText>
            </EuiFlexItem>
          )}
          {props.totalHitCount !== 0 && (
            <EuiFlexItem grow={false} data-test-subj="toolBarTotalDocsText">
              <TotalDocuments totalHitCount={props.totalHitCount} />
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem style={{ minHeight: 0 }}>
        <DocTableWrapperMemoized ref={tableWrapperRef} {...props} render={renderDocTable} />
      </EuiFlexItem>

      {showPagination && (
        <EuiFlexItem grow={false}>
          <ToolBarPagination
            pageSize={pageSize}
            pageCount={totalPages}
            activePage={curPageIndex}
            onPageClick={onPageChange}
            onPageSizeChange={onPageSizeChange}
          />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
