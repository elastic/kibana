import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';

import { EuiSearchBar, EuiBasicTable, EuiButton, EuiIcon } from '@elastic/eui';
import { getSavedObjectIcon } from '../../../../lib/get_saved_object_icon';

export class Table extends PureComponent {
  static propTypes = {
    selectedSavedObjects: PropTypes.array.isRequired,
    selectionConfig: PropTypes.shape({
      itemId: PropTypes.string.isRequired,
      selectable: PropTypes.func,
      selectableMessage: PropTypes.func,
      onSelectionChange: PropTypes.func.isRequired,
    }).isRequired,
    filterOptions: PropTypes.array.isRequired,
    fetchData: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
    onExport: PropTypes.func.isRequired,

    pageIndex: PropTypes.number.isRequired,
    pageSize: PropTypes.number.isRequired,
    items: PropTypes.array.isRequired,
    totalItemCount: PropTypes.number.isRequired,
    onQueryChange: PropTypes.func.isRequired,
    onTableChange: PropTypes.func.isRequired,
    isSearching: PropTypes.bool.isRequired,

    onShowRelationships: PropTypes.func.isRequired,
  };

  render() {
    const {
      pageIndex,
      pageSize,
      items,
      totalItemCount,
      isSearching,
      filterOptions,
      selectionConfig: selection,
      onDelete,
      onExport,
      selectedSavedObjects,
      onQueryChange,
      onTableChange,
    } = this.props;

    const pagination = {
      pageIndex: pageIndex,
      pageSize: pageSize,
      totalItemCount: totalItemCount,
      pageSizeOptions: [5, 10, 20, 50],
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

    const columns = [
      {
        field: 'type',
        name: 'Type',
        width: '35px',
        description: `Type of the saved object`,
        sortable: false,
        render: (type) => {
          return (
            <EuiIcon type={getSavedObjectIcon(type)} size="s"/>
          );
        },
      },
      {
        field: 'title',
        name: 'Title',
        description: `Title of the saved object`,
        dataType: 'string',
        sortable: false,
        render: (title, object) => (
          <div style={{ width: '100%', cursor: 'pointer' }} onClick={() => this.props.onShowRelationships(object.id, object.type, title)}>
            {title}
          </div>
        ),
      },
    ];

    return (
      <Fragment>
        <EuiSearchBar
          filters={filters}
          onChange={onQueryChange}
          toolsRight={[
            <EuiButton
              key="deleteSO"
              iconType="trash"
              color="danger"
              size="s"
              onClick={() => onDelete(pageIndex, pageSize)}
              isDisabled={selectedSavedObjects.length === 0}
            >
              Delete
            </EuiButton>,
            <EuiButton
              key="exportSO"
              iconType="exportAction"
              size="s"
              onClick={onExport}
              isDisabled={selectedSavedObjects.length === 0}
            >
              Export
            </EuiButton>,
          ]}
        />
        <EuiBasicTable
          loading={isSearching}
          items={items}
          columns={columns}
          pagination={pagination}
          selection={selection}
          onChange={onTableChange}
        />
      </Fragment>
    );
  }
}
