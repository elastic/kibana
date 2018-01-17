import React, { Component } from 'react';
import PropTypes from 'prop-types';
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

import {
  Pager
} from '@elastic/eui/lib/services';

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

    this.pager = new Pager(props.indices.length, this.state.perPage, this.state.page);
  }

  onChangePage = page => {
    this.pager.goToPageIndex(page);
    this.setState({ page });
  }

  onChangePerPage = perPage => {
    this.pager.setItemsPerPage(perPage);
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

    const pageCount = this.pager.getTotalPages();

    const paginationControls = pageCount > 1
      ? (
        <EuiFlexItem grow={false}>
          <EuiPagination
            pageCount={pageCount}
            activePage={page}
            onPageClick={this.onChangePage}
          />
        </EuiFlexItem>
      )
      : null;

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
        {paginationControls}
      </EuiFlexGroup>
    );
  }

  render() {
    const { indices } = this.props;

    const paginatedIndices = indices.slice(this.pager.firstItemIndex, this.pager.lastItemIndex + 1);
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
