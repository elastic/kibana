import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { getPaginatedIndices } from '../../../../lib/get_paginated_indices';
import { PER_PAGE_INCREMENTS } from '../../../../constants';

import {
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

export class IndicesList extends Component {
  static propTypes = {
    indices: PropTypes.array.isRequired,
  }

  constructor(props) {
    super(props);

    this.state = {
      page: 0,
      perPage: PER_PAGE_INCREMENTS[1],
      isPerPageControlOpen: false,
    };
  }

  onChangePage = page => {
    this.setState({ page });
  }

  onChangePerPage = perPage => {
    this.setState({ perPage });
    this.closePerPageControl();
  }

  openPerPageControl = () => {
    this.setState({ isPerPageControlOpen: true });
  }

  closePerPageControl = () => {
    this.setState({ isPerPageControlOpen: false });
  }

  renderPagination() {
    const { perPage, page, isPerPageControlOpen } = this.state;
    const { indices } = this.props;

    const button = (
      <EuiButtonEmpty
        size="s"
        color="text"
        iconType="arrowDown"
        iconSide="right"
        onClick={this.openPerPageControl}
      >
        Rows per page: {perPage}
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

    const pageCount = Math.ceil(indices.length / perPage);

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
            <EuiContextMenuPanel
              items={items}
            />
          </EuiPopover>
        </EuiFlexItem>
        { pageCount > 1 ?
          <EuiFlexItem grow={false}>
            <EuiPagination
              pageCount={pageCount}
              activePage={page}
              onPageClick={this.onChangePage}
            />
          </EuiFlexItem>
          : null
        }

      </EuiFlexGroup>
    );
  }

  render() {
    const { indices } = this.props;
    const { page, perPage } = this.state;

    const paginatedIndices = getPaginatedIndices(indices, page, perPage);
    const rows = paginatedIndices.map((index, key) => {
      return (
        <EuiTableRow key={key}>
          <EuiTableRowCell>
            {index.name}
          </EuiTableRowCell>
        </EuiTableRow>
      );
    });

    return (
      <div>
        <EuiTable>
          <EuiTableBody>
            {rows}
          </EuiTableBody>
        </EuiTable>
        <EuiSpacer size="m"/>
        {this.renderPagination()}
      </div>
    );
  }
}
