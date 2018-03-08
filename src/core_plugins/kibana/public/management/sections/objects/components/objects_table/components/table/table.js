import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';

import { EuiInMemoryTable, EuiBadge } from '@elastic/eui';

import { OnServerTable } from './on_server_table';

export class Table extends PureComponent {
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
    // totalCount: PropTypes.number,
  };

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

  render() {
    const {
      items,
      selectionConfig: selection,
      clientSideSearchingEnabled,
      filterOptions,
      fetchData,
      // totalCount,
      onSearchChanged,
    } = this.props;

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
        incremental: clientSideSearchingEnabled,
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

    if (clientSideSearchingEnabled) {
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

    return (
      <OnServerTable
        fetch={fetchData}
        onSearchChanged={onSearchChanged}
        columns={columns}
        pagination={pagination}
        selection={selection}
        search={search}
        sorting={true}
      />
    );
  }
}
