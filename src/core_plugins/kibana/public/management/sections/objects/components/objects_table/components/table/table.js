import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';

import { EuiBadge } from '@elastic/eui';
import { InMemoryTable } from './in_memory_table';
import { OnServerTable } from './on_server_table';

export class Table extends Component {
  static propTypes = {
    items: PropTypes.array.isRequired,
    selectedSavedObjectIds: PropTypes.array.isRequired,
    selectionConfig: PropTypes.shape({
      itemId: PropTypes.string.isRequired,
      selectable: PropTypes.func,
      selectableMessage: PropTypes.func,
      onSelectionChange: PropTypes.func.isRequired,
    }).isRequired,
    clientSideSearchingEnabled: PropTypes.bool.isRequired,
    isPerformingInitialFetch: PropTypes.bool.isRequired,
    filterOptions: PropTypes.array.isRequired,
    fetchData: PropTypes.func,
    onSearchChanged: PropTypes.func,
    onDelete: PropTypes.func.isRequired,
    onExport: PropTypes.func.isRequired,
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
    ];
  }

  render() {
    const {
      clientSideSearchingEnabled,
      isPerformingInitialFetch,
      ...rest
      // items,
      // selectionConfig,
      // filterOptions,
      // fetchData,
      // onSearchChanged,
      // selectedSavedObjectIds,
      // onExport,
      // onDelete,
    } = this.props;

    if (clientSideSearchingEnabled || isPerformingInitialFetch) {
      return (
        <InMemoryTable
          columns={this.getColumns()}
          {...rest}
        />
      );
    }

    return (
      <OnServerTable
        columns={this.getColumns()}
        {...rest}
      />
    );
  }
}
