/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';

import {
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTable,
  EuiTableBody,
  EuiTableRow,
  EuiTableRowCell,
  EuiButtonEmpty,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiPagination,
  EuiPopover,
} from '@elastic/eui';

import { Pager } from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n-react';
import { MatchedItem, Tag } from '../../../types';

interface IndicesListProps {
  indices: MatchedItem[];
  query: string;
}

interface IndicesListState {
  page: number;
  perPage: number;
  isPerPageControlOpen: boolean;
}

const PER_PAGE_INCREMENTS = [5, 10, 20, 50];

export class IndicesList extends React.Component<IndicesListProps, IndicesListState> {
  pager: Pager;
  constructor(props: IndicesListProps) {
    super(props);

    this.state = {
      page: 0,
      perPage: PER_PAGE_INCREMENTS[1],
      isPerPageControlOpen: false,
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
    this.closePerPageControl();
  };

  openPerPageControl = () => {
    this.setState({ isPerPageControlOpen: true });
  };

  closePerPageControl = () => {
    this.setState({ isPerPageControlOpen: false });
  };

  renderPagination() {
    const { perPage, page, isPerPageControlOpen } = this.state;

    const button = (
      <EuiButtonEmpty
        size="s"
        color="text"
        iconType="arrowDown"
        iconSide="right"
        onClick={this.openPerPageControl}
      >
        <FormattedMessage
          id="indexPatternEditor.pagingLabel"
          defaultMessage="Rows per page: {perPage}"
          values={{ perPage }}
        />
      </EuiButtonEmpty>
    );

    const items = PER_PAGE_INCREMENTS.map((increment) => {
      return (
        <EuiContextMenuItem
          key={increment}
          icon="empty"
          onClick={() => this.onChangePerPage(increment)}
        >
          {increment}
        </EuiContextMenuItem>
      );
    });

    const pageCount = this.pager.getTotalPages();

    const paginationControls =
      pageCount > 1 ? (
        <EuiFlexItem grow={false}>
          <EuiPagination pageCount={pageCount} activePage={page} onPageClick={this.onChangePage} />
        </EuiFlexItem>
      ) : null;

    return (
      <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiPopover
            id="customizablePagination"
            button={button}
            isOpen={isPerPageControlOpen}
            closePopover={this.closePerPageControl}
            panelPaddingSize="none"
          >
            <EuiContextMenuPanel items={items} />
          </EuiPopover>
        </EuiFlexItem>
        {paginationControls}
      </EuiFlexGroup>
    );
  }

  highlightIndexName(indexName: string, query: string) {
    const queryIdx = indexName.indexOf(query);
    if (!query || queryIdx === -1) {
      return indexName;
    }

    const preStr = indexName.substr(0, queryIdx);
    const postStr = indexName.substr(queryIdx + query.length);

    return (
      <span>
        {preStr}
        <strong>{query}</strong>
        {postStr}
      </span>
    );
  }

  render() {
    const { indices, query, ...rest } = this.props;

    const queryWithoutWildcard = query.endsWith('*') ? query.substr(0, query.length - 1) : query;

    const paginatedIndices = indices.slice(this.pager.firstItemIndex, this.pager.lastItemIndex + 1);
    const rows = paginatedIndices.map((index, key) => {
      return (
        <EuiTableRow key={key}>
          <EuiTableRowCell>
            {this.highlightIndexName(index.name, queryWithoutWildcard)}
          </EuiTableRowCell>
          <EuiTableRowCell>
            {index.tags.map((tag: Tag) => {
              return (
                <EuiBadge key={`index_${key}_tag_${tag.key}`} color={tag.color}>
                  {tag.name}
                </EuiBadge>
              );
            })}
          </EuiTableRowCell>
        </EuiTableRow>
      );
    });

    return (
      <div {...rest}>
        <EuiTable responsive={false} tableLayout="auto">
          <EuiTableBody>{rows}</EuiTableBody>
        </EuiTable>
        <EuiSpacer size="m" />
        {this.renderPagination()}
      </div>
    );
  }
}
