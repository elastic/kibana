import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';

import {
  EuiBasicTable,
  EuiSearchBar,
  Query,
} from '@elastic/eui';

export class OnServerTable extends Component {
  static propTypes = {
    columns: PropTypes.array.isRequired,
    selectionConfig: PropTypes.shape({
      itemId: PropTypes.string.isRequired,
      selectable: PropTypes.func,
      selectableMessage: PropTypes.func,
      onSelectionChange: PropTypes.func.isRequired,
    }).isRequired,
    filterOptions: PropTypes.array.isRequired,
    fetchData: PropTypes.func.isRequired,
    onSearchChanged: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      pageIndex: 0,
      pageSize: 5,
      selectedItems: [],
      multiAction: false,
      query: Query.parse(''),
      pageOfItems: [],
      totalItemCount: 0,
      isSearching: false,
    };
  }

  componentWillMount() {
    this.fetchItems();
  }

  onQueryChanged = query => {
    this.setState({ query });
    this.fetchItems(query);
  };

  async fetchItems(
    query = this.state.query,
    pageIndex = this.state.pageIndex,
    pageSize = this.state.pageSize
  ) {
    this.setState({ isSearching: true });

    const { pageOfItems = [], totalItemCount = 0 } = await this.props.fetchData(
      query,
      pageIndex,
      pageSize
    );

    this.setState({
      pageOfItems,
      totalItemCount,
      isSearching: false,
    });
  }

  onTableChange = async ({ page = {} }) => {
    const { index: pageIndex, size: pageSize } = page;

    this.setState({
      pageIndex,
      pageSize,
    });

    this.fetchItems(undefined, pageIndex, pageSize);
  };

  render() {
    const {
      pageIndex,
      pageSize,
      pageOfItems,
      totalItemCount,
      isSearching,
    } = this.state;
    const { filterOptions, columns } = this.props;

    const pagination = {
      pageIndex: pageIndex,
      pageSize: pageSize,
      totalItemCount: totalItemCount,
      pageSizeOptions: [5, 10, 20, 50],
    };

    const selection = {
      itemId: 'id',
      onSelectionChange: this.onSelectionChange,
    };

    const filters = [
      {
        type: 'field_value_selection',
        field: 'type',
        name: 'Type',
        multiSelect: 'or',
        options: filterOptions,
      },
      {
        type: 'field_value_selection',
        field: 'tag',
        name: 'Tags',
        multiSelect: 'or',
        options: [],
      },
    ];

    return (
      <Fragment>
        <EuiSearchBar
          filters={filters}
          onChange={this.onQueryChanged}
          onParse={({ error }) => this.setState({ error })}
        />
        <EuiBasicTable
          loading={isSearching}
          items={pageOfItems}
          columns={columns}
          pagination={pagination}
          selection={selection}
          onChange={this.onTableChange}
        />
      </Fragment>
    );
  }
}
