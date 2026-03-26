/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';

import {
  EuiBadge,
  EuiSpacer,
  EuiTable,
  EuiTableBody,
  EuiTableRow,
  EuiTableRowCell,
  EuiTablePagination,
  htmlIdGenerator,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { Pager } from '@elastic/eui';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import type { MatchedItem, Tag } from '@kbn/data-views-plugin/public';
import { INDEX_PATTERN_TYPE } from '@kbn/data-views-plugin/public';
import { RollupDeprecationTooltip } from '@kbn/rollup';

export interface IndicesListProps {
  indices: MatchedItem[];
  query: string;
  isExactMatch: (indexName: string) => boolean;
}

interface IndicesListState {
  page: number;
  perPage: number;
}

const PER_PAGE_INCREMENTS = [5, 10, 20, 50];
export const PER_PAGE_STORAGE_KEY = 'dataViews.previewPanel.indicesPerPage';

export class IndicesList extends React.Component<IndicesListProps, IndicesListState> {
  pager: Pager;
  storage: Storage;
  idGenerator = htmlIdGenerator();

  constructor(props: IndicesListProps) {
    super(props);

    this.storage = new Storage(localStorage);

    this.state = {
      page: 0,
      perPage: this.storage.get(PER_PAGE_STORAGE_KEY) || PER_PAGE_INCREMENTS[1],
    };

    this.pager = new Pager(props.indices.length, this.state.perPage, this.state.page);
  }

  UNSAFE_componentWillReceiveProps(nextProps: IndicesListProps) {
    if (nextProps.indices.length !== this.props.indices.length) {
      this.pager.setTotalItems(nextProps.indices.length);
      this.resetPageTo0();
    }
  }

  resetPageTo0 = () => this.onChangePage(0);

  onChangePage = (page: number) => {
    this.pager.goToPageIndex(page);
    this.setState({ page });
  };

  onChangePerPage = (perPage: number) => {
    this.pager.setItemsPerPage(perPage);
    this.setState({ perPage });
    this.resetPageTo0();
    this.storage.set(PER_PAGE_STORAGE_KEY, perPage);
  };

  renderPagination(indicesTableId: string) {
    const { perPage, page } = this.state;
    const pageCount = this.pager.getTotalPages();

    return (
      <EuiTablePagination
        activePage={page}
        itemsPerPage={perPage}
        compressed={false}
        itemsPerPageOptions={PER_PAGE_INCREMENTS}
        onChangeItemsPerPage={(increment) => this.onChangePerPage(increment)}
        onChangePage={(p) => this.onChangePage(p)}
        pageCount={pageCount}
        responsive={['xs', 's']}
        aria-label={i18n.translate('indexPatternEditor.pagination.ariaLabel', {
          defaultMessage: 'Indices list pagination',
        })}
        aria-controls={indicesTableId}
      />
    );
  }

  highlightIndexName(indexName: string, query: string) {
    const { isExactMatch } = this.props;

    if (!query) {
      return indexName;
    }

    if (isExactMatch(indexName)) {
      return <strong>{indexName}</strong>;
    }

    const queryAsArray = query
      .split(',')
      .map((q) => q.trim())
      .filter(Boolean);
    let queryIdx = -1;
    let queryWithoutWildcard = '';
    for (let i = 0; i < queryAsArray.length; i++) {
      const queryComponent = queryAsArray[i];
      queryWithoutWildcard = queryComponent.endsWith('*')
        ? queryComponent.substring(0, queryComponent.length - 1)
        : queryComponent;
      queryIdx = indexName.indexOf(queryWithoutWildcard);

      if (queryIdx !== -1) {
        break;
      }
    }

    if (queryIdx === -1) {
      return indexName;
    }

    const preStr = indexName.substring(0, queryIdx);
    const postStr = indexName.substr(queryIdx + queryWithoutWildcard.length);

    return (
      <span>
        {preStr}
        <strong>{queryWithoutWildcard}</strong>
        {postStr}
      </span>
    );
  }

  render() {
    const { indices, query, isExactMatch, ...rest } = this.props;
    const indicesTableId = this.idGenerator('indices-list-table');

    const paginatedIndices = indices.slice(this.pager.firstItemIndex, this.pager.lastItemIndex + 1);
    const rows = paginatedIndices.map((index, key) => {
      return (
        <EuiTableRow data-test-subj="indicesListTableRow" key={key}>
          <EuiTableRowCell>{this.highlightIndexName(index.name, query)}</EuiTableRowCell>
          <EuiTableRowCell>
            {index.tags.map((tag: Tag) => {
              const badge = (
                <EuiBadge key={`index_${key}_tag_${tag.key}`} color={tag.color}>
                  {tag.name}
                </EuiBadge>
              );

              return tag.key === INDEX_PATTERN_TYPE.ROLLUP ? (
                <>
                  &nbsp;<RollupDeprecationTooltip>{badge}</RollupDeprecationTooltip>
                </>
              ) : (
                badge
              );
            })}
          </EuiTableRowCell>
        </EuiTableRow>
      );
    });

    return (
      <div {...rest}>
        <EuiTable responsiveBreakpoint={false} tableLayout="auto" id={indicesTableId}>
          <EuiTableBody>{rows}</EuiTableBody>
        </EuiTable>
        <EuiSpacer size="m" />
        {this.renderPagination(indicesTableId)}
      </div>
    );
  }
}
