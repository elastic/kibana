import React, { PureComponent, Fragment } from 'react';
import PropTypes from 'prop-types';

import {
  EuiSearchBar,
  EuiBasicTable,
  EuiButton,
  EuiIcon,
  EuiLink,
  EuiSpacer,
  EuiToolTip
} from '@elastic/eui';
import { getSavedObjectLabel, getSavedObjectIcon } from '../../../../lib';

export class Table extends PureComponent {
  static propTypes = {
    selectedSavedObjects: PropTypes.array.isRequired,
    selectionConfig: PropTypes.shape({
      selectable: PropTypes.func,
      selectableMessage: PropTypes.func,
      onSelectionChange: PropTypes.func.isRequired,
    }).isRequired,
    filterOptions: PropTypes.array.isRequired,
    onDelete: PropTypes.func.isRequired,
    onExport: PropTypes.func.isRequired,
    getEditUrl: PropTypes.func.isRequired,
    goInApp: PropTypes.func.isRequired,

    pageIndex: PropTypes.number.isRequired,
    pageSize: PropTypes.number.isRequired,
    items: PropTypes.array.isRequired,
    itemId: PropTypes.oneOfType([
      PropTypes.string, // the name of the item id property
      PropTypes.func    // (item) => string
    ]),
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
      itemId,
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
      goInApp,
      getEditUrl,
      onShowRelationships,
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
      // Add this back in once we have tag support
      // {
      //   type: 'field_value_selection',
      //   field: 'tag',
      //   name: 'Tags',
      //   multiSelect: 'or',
      //   options: [],
      // },
    ];

    const columns = [
      {
        field: 'type',
        name: 'Type',
        width: '50px',
        align: 'center',
        description: `Type of the saved object`,
        sortable: false,
        render: type => {
          return (
            <EuiToolTip
              position="top"
              content={getSavedObjectLabel(type)}
            >
              <EuiIcon
                aria-label={getSavedObjectLabel(type)}
                type={getSavedObjectIcon(type)}
                size="s"
              />
            </EuiToolTip>
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
          <EuiLink href={getEditUrl(object.id, object.type)}>{title}</EuiLink>
        ),
      },
      {
        name: 'Actions',
        actions: [
          {
            name: 'In app',
            description:
              'View this saved object within Kibana',
            icon: 'eye',
            onClick: object => goInApp(object.id, object.type),
          },
          {
            name: 'Relationships',
            description:
              'View the relationships this saved object has to other saved objects',
            icon: 'kqlSelector',
            onClick: object =>
              onShowRelationships(object.id, object.type, object.title),
          },
        ],
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
              onClick={onDelete}
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
        <EuiSpacer size="s" />
        <div data-test-subj="savedObjectsTable">
          <EuiBasicTable
            loading={isSearching}
            itemId={itemId}
            items={items}
            columns={columns}
            pagination={pagination}
            selection={selection}
            onChange={onTableChange}
          />
        </div>
      </Fragment>
    );
  }
}
