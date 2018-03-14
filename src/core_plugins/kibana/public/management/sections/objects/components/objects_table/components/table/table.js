import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';

import {
  EuiInMemoryTable,
  EuiBadge,
  EuiBasicTable,
  EuiSearchBar,
  Query,
} from '@elastic/eui';

export class Table extends Component {
  static propTypes = {
    items: PropTypes.array.isRequired,
    selectionConfig: PropTypes.shape({
      itemId: PropTypes.string.isRequired,
      selectable: PropTypes.func,
      selectableMessage: PropTypes.func,
      onSelectionChange: PropTypes.func.isRequired,
    }).isRequired,
    clientSideSearchingEnabled: PropTypes.bool.isRequired,
    filterOptions: PropTypes.array.isRequired,
    fetchData: PropTypes.func,
    onSearchChanged: PropTypes.func,
  };

  constructor(props) {
    super(props);

    this.state = {
      pageIndex: 0,
      pageSize: 5,
      sortField: 'title',
      sortDirection: 'asc',
      selectedItems: [],
      multiAction: false,
      query: '',
      pageOfItems: [],
      totalItemCount: 0,
    };
  }

  componentDidMount() {
    this.fetchItems(Query.parse(''));
  }

  getColumns() {
    return [
      {
        field: 'title',
        name: 'Title',
        description: `Title of the saved object`,
        dataType: 'string',
        sortable: true,
        render: (title, savedObject) => {
          return (
            <Fragment>
              <EuiBadge iconType={savedObject.icon}>
                {savedObject.type}
              </EuiBadge>
              &nbsp;
              <span>{title}</span>
            </Fragment>
          );
        },
      },
      // },
      // {
      //   name: '',
      //   actions: [
      //     {
      //       name: 'Edit',
      //       description: 'Edit this field',
      //       icon: 'pencil',
      //       onClick: editField,
      //     },
      //     {
      //       name: 'Delete',
      //       description: 'Delete this field',
      //       icon: 'trash',
      //       color: 'danger',
      //       onClick: deleteField,
      //     },
      //   ]
      // }
    ];
  }

  renderInMemoryTable() {
    const { items, selectionConfig: selection, filterOptions } = this.props;

    const columns = this.getColumns();
    const pagination = {
      pageSizeOptions: [5, 10, 25, 50],
    };

    const search = {
      // TODO: Verify which version of EUI supports this
      // toolsRight: [
      //   <EuiButton
      //     key="deleteSavedObject"
      //     iconType="trash"
      //     // onClick={this.loadUsers.bind(this)}
      //     // isDisabled={this.state.loading}
      //   >
      //     Delete
      //   </EuiButton>,
      //   <EuiButton
      //     key="exportSavedObject"
      //     // onClick={this.loadUsersWithError.bind(this)}
      //     // isDisabled={this.state.loading}
      //   >
      //     Export
      //   </EuiButton>,
      // ],
      box: {
        incremental: true,
      },
      filters: [
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
      ],
    };

    return (
      <EuiInMemoryTable
        items={items}
        columns={columns}
        pagination={pagination}
        selection={selection}
        search={search}
        sorting={true}
      />
    );
  }

  renderBasicTable() {
    const {
      pageIndex,
      pageSize,
      sortField,
      sortDirection,
      pageOfItems,
      totalItemCount,
    } = this.state;
    const { filterOptions } = this.props;

    const pagination = {
      pageIndex: pageIndex,
      pageSize: pageSize,
      totalItemCount: totalItemCount,
      pageSizeOptions: [5, 10, 20, 50],
    };

    const sorting = {
      sort: {
        field: sortField,
        direction: sortDirection,
      },
    };

    const selection = {
      itemId: 'id',
      selectable: user => user.online,
      selectableMessage: selectable =>
        !selectable ? 'User is currently offline' : undefined,
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
          items={pageOfItems}
          columns={this.getColumns()}
          pagination={pagination}
          sorting={sorting}
          selection={selection}
          onChange={this.onTableChange}
        />
      </Fragment>
    );
  }

  onQueryChanged = query => {
    this.setState({ query });
    this.fetchItems(query);
  };

  async fetchItems(
    query = this.state.query,
    pageIndex = this.state.pageIndex,
    pageSize = this.state.pageSize,
    sortField = this.state.sortField,
    sortDirection = this.state.sortDirection
  ) {
    const { pageOfItems = [], totalItemCount = 0 } = await this.props.fetchData(
      query,
      pageIndex,
      pageSize,
      sortField,
      sortDirection
    );

    this.setState({
      pageOfItems,
      totalItemCount,
    });
  }

  onTableChange = async ({ page = {}, sort = {} }) => {
    const { index: pageIndex, size: pageSize } = page;

    const { field: sortField, direction: sortDirection } = sort;

    this.setState({
      pageIndex,
      pageSize,
      sortField,
      sortDirection,
    });
    this.fetchItems(undefined, pageIndex, pageSize, sortField, sortDirection);
  };

  render() {
    if (this.props.clientSideSearchingEnabled) {
      return this.renderInMemoryTable();
    }

    return this.renderBasicTable();
  }
}
