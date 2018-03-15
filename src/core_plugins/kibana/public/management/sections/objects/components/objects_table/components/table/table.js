import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';

import {
  EuiBadge,
} from '@elastic/eui';
import { InMemoryTable } from './in_memory_table';
import { OnServerTable } from './on_server_table';

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
    if (this.props.clientSideSearchingEnabled) {
      return (
        <InMemoryTable
          columns={this.getColumns()}
          items={this.props.items}
          selectionConfig={this.props.selectionConfig}
          filterOptions={this.props.filterOptions}
        />
      );
    }

    return (
      <OnServerTable
        columns={this.getColumns()}
        selectionConfig={this.props.selectionConfig}
        filterOptions={this.props.filterOptions}
        fetchData={this.props.fetchData}
        onSearchChanged={this.props.onSearchChanged}
      />
    );
  }
}
