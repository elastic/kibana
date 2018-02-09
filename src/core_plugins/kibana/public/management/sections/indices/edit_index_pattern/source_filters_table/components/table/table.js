import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
  EuiTableOfRecords,
  EuiFieldText,
} from '@elastic/eui';

export class Table extends Component {
  static propTypes = {
    indexPattern: PropTypes.object.isRequired,
    model: PropTypes.shape({
      data: PropTypes.shape({
        records: PropTypes.array.isRequired,
        totalRecordCount: PropTypes.number.isRequired,
      }).isRequired,
      criteria: PropTypes.shape({
        page: PropTypes.shape({
          index: PropTypes.number.isRequired,
          size: PropTypes.number.isRequired,
        }).isRequired,
        sort: PropTypes.shape({
          field: PropTypes.string.isRequired,
          direction: PropTypes.string.isRequired,
        }).isRequired,
      }).isRequired,
    }),
    deleteFilter: PropTypes.func.isRequired,
    onDataCriteriaChange: PropTypes.func.isRequired,
    fieldWildcardMatcher: PropTypes.func.isRequired,
    saveFilter: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props);
    this.state = {
      editingFilter: null,
      editingFilterValue: null,
    };
  }

  startEditingFilter = field => this.setState({ editingFilter: field, editingFilterValue: field })
  stopEditingFilter = () => this.setState({ editingFilter: null })
  onEditingFilterChange = e => this.setState({ editingFilterValue: e.target.value })

  getTableConfig() {
    const {
      deleteFilter,
      onDataCriteriaChange,
      fieldWildcardMatcher,
      indexPattern,
      saveFilter,
    } = this.props;

    const saveOrEditAction = this.state.editingFilter
      ? {
        name: 'Save',
        description: 'Save this field',
        icon: 'checkInCircleFilled',
        onClick: () => {
          saveFilter({
            oldFilterValue: this.state.editingFilter,
            newFilterValue: this.state.editingFilterValue,
          });
          this.stopEditingFilter();
        }
      } : {
        name: 'Edit',
        description: 'Edit this field',
        icon: 'pencil',
        onClick: filter => this.startEditingFilter(filter.value),
      };

    return {
      recordId: 'id',
      columns: [
        {
          field: 'value',
          name: 'Filter',
          description: `Filter name`,
          dataType: 'string',
          sortable: true,
          render: value => {
            if (this.state.editingFilter === value) {
              return (
                <EuiFieldText
                  value={this.state.editingFilterValue}
                  onChange={this.onEditingFilterChange}
                />
              );
            }

            return (
              <span>{value}</span>
            );
          }
        },
        {
          field: 'value',
          name: 'Matches',
          description: `Language used for the field`,
          dataType: 'string',
          sortable: true,
          render: value => {
            const matcher = fieldWildcardMatcher([ value ]);
            const matches = indexPattern.getNonScriptedFields().map(f => f.name).filter(matcher).sort();
            if (matches.length) {
              return (
                <span>
                  {matches.join(', ')}
                </span>
              );
            }

            return (<em>The source filter doesn&apos;t match any known fields.</em>);
          }
        },
        {
          name: '',
          actions: [
            saveOrEditAction,
            {
              name: 'Delete',
              description: 'Delete this field',
              icon: 'trash',
              color: 'danger',
              onClick: deleteFilter,
            },
          ]
        }
      ],
      pagination: {
        pageSizeOptions: [5, 10, 25, 50]
      },
      selection: undefined,
      onDataCriteriaChange,
    };
  }

  render() {
    const { model } = this.props;

    return (
      <EuiTableOfRecords config={this.getTableConfig()} model={model} />
    );
  }
}
