/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { PER_PAGE_INCREMENTS } from '../../../../constants';

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

import { Pager } from '@elastic/eui/lib/services';

import { FormattedMessage } from '@kbn/i18n/react';

export class IndicesList extends Component {
  static propTypes = {
    indices: PropTypes.array.isRequired,
    query: PropTypes.string.isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      page: 0,
      perPage: PER_PAGE_INCREMENTS[1],
      isPerPageControlOpen: false,
    };

    this.pager = new Pager(props.indices.length, this.state.perPage, this.state.page);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.indices.length !== this.props.indices.length) {
      this.pager.setTotalItems(nextProps.indices.length);
      this.resetPageTo0();
    }
  }

  resetPageTo0 = () => this.onChangePage(0);

  onChangePage = page => {
    this.pager.goToPageIndex(page);
    this.setState({ page });
  };

  onChangePerPage = perPage => {
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
          id="kbn.management.createIndexPattern.step.pagingLabel"
          defaultMessage="Rows per page: {perPage}"
          values={{ perPage }}
        />
      </EuiButtonEmpty>
    );

    const items = PER_PAGE_INCREMENTS.map(increment => {
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
            withTitle
          >
            <EuiContextMenuPanel items={items} />
          </EuiPopover>
        </EuiFlexItem>
        {paginationControls}
      </EuiFlexGroup>
    );
  }

  highlightIndexName(indexName, query) {
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
            {index.tags.map(tag => {
              return (
                <EuiBadge key={`index_${key}_tag_${tag.key}`} color="primary">
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
        <EuiTable>
          <EuiTableBody>{rows}</EuiTableBody>
        </EuiTable>
        <EuiSpacer size="m" />
        {this.renderPagination()}
      </div>
    );
  }
}
