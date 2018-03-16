import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { EuiInMemoryTable } from '@elastic/eui';
import { createSelector } from 'reselect';
import { Tools } from './tools';

function getQueryText(query) {
  return query && query.ast.getTermClauses().length
    ? query.ast
      .getTermClauses()
      .map(clause => clause.value)
      .join(' ')
    : '';
}

export class InMemoryTable extends Component {
  static propTypes = {
    columns: PropTypes.array.isRequired,
    selectedSavedObjectIds: PropTypes.array.isRequired,
    items: PropTypes.array.isRequired,
    selectionConfig: PropTypes.shape({
      itemId: PropTypes.string.isRequired,
      selectable: PropTypes.func,
      selectableMessage: PropTypes.func,
      onSelectionChange: PropTypes.func.isRequired,
    }).isRequired,
    filterOptions: PropTypes.array.isRequired,
  };

  constructor(props) {
    super(props);

    this.state = {
      activeQuery: '',
      activeType: undefined,
    };
  }

  getFilteredSavedObjects = createSelector(
    (state, props) => props.items,
    state => state.activeQuery,
    state => state.activeType,
    (savedObjects, activeQuery, activeType) => {
      const lowercaseQuery = getQueryText(activeQuery).toLowerCase();
      const filteredSavedObjects = savedObjects.filter(savedObject => {
        if (activeType && activeType !== savedObject.type) {
          return false;
        }
        if (
          lowercaseQuery &&
          !savedObject.title.toLowerCase().includes(lowercaseQuery)
        ) {
          return false;
        }
        return true;
      });
      return filteredSavedObjects;
    }
  );

  render() {
    const {
      selectionConfig: selection,
      filterOptions,
      columns,
      selectedSavedObjectIds,
    } = this.props;

    const pagination = {
      pageSizeOptions: [5, 10, 25, 50],
    };

    const items = this.getFilteredSavedObjects(this.state, this.props);

    const search = {
      toolsRight: <Tools isDisabled={selectedSavedObjectIds.length === 0} />,
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
}
