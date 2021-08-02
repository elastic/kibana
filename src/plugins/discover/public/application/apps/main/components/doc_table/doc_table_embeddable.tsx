/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { useMemo } from 'react';
import { FormattedMessage } from '@kbn/i18n/react';
import { EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { SAMPLE_SIZE_SETTING } from '../../../../../../common';
import { usePager } from './lib/use_pager';
import { ToolBarPagination } from './components/pager/tool_bar_pagination';
import { DocTableProps, DocTableRenderProps, DocTableWrapper } from './doc_table_wrapper';
import { TotalDocuments } from '../total_documents/total_documents';
import { getServices } from '../../../../../kibana_services';

export type DocTableEmbeddableProps = Omit<DocTableProps, 'render'> & {
  totalHitCount: number;
};

export const DocTableEmbeddable = (props: DocTableEmbeddableProps) => {
  const pager = usePager({ totalItems: props.rows.length });

  const pageOfItems = useMemo(
    () => props.rows.slice(pager.startIndex, pager.pageSize + pager.startIndex),
    [pager.pageSize, pager.startIndex, props.rows]
  );

  const shouldShowLimitedResultsWarning = () =>
    !pager.hasNextPage && props.rows.length < props.totalHitCount;

  const moveFocus = () => {
    const scrollDiv = document.querySelector('.kbnDocTableWrapper') as HTMLElement;
    scrollDiv.focus();
    scrollDiv.scrollTo(0, 0);
  };

  const onPageChange = (page: number) => {
    moveFocus();
    pager.onPageChange(page);
  };

  const onPageSizeChange = (size: number) => {
    moveFocus();
    pager.onPageSizeChange(size);
  };

  const sampleSize = useMemo(() => {
    return getServices().uiSettings.get(SAMPLE_SIZE_SETTING, 500);
  }, []);

  const renderDocTable = (renderProps: DocTableRenderProps) => {
    return (
      <div className="kbnDocTable__container">
        <table className="kbnDocTable table" data-test-subj="docTable">
          <thead>{renderProps.renderHeader()}</thead>
          <tbody>{renderProps.renderRows(pageOfItems)}</tbody>
        </table>
      </div>
    );
  };

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
          {shouldShowLimitedResultsWarning() && (
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
          <EuiFlexItem grow={false} data-test-subj="toolBarTotalDocsText">
            <TotalDocuments totalHitCount={props.totalHitCount} />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiFlexItem style={{ minHeight: 0 }}>
        <DocTableWrapper {...props} render={renderDocTable} />
      </EuiFlexItem>

      <EuiFlexItem grow={false}>
        <ToolBarPagination
          pageSize={pager.pageSize}
          pageCount={pager.totalPages}
          activePage={pager.currentPage}
          onPageClick={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
