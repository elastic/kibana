import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';

import {
  EuiInMemoryTable,
  EuiFieldText,
  EuiButtonIcon,
  keyCodes,
  RIGHT_ALIGNMENT,
} from '@elastic/eui';

export class Table extends Component {
  static propTypes = {
    indexPattern: PropTypes.object.isRequired,
    items: PropTypes.array.isRequired,
    deleteFilter: PropTypes.func.isRequired,
    fieldWildcardMatcher: PropTypes.func.isRequired,
    saveFilter: PropTypes.func.isRequired,
    isSaving: PropTypes.bool.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      editingFilterId: null,
      editingFilterValue: null,
    };
  }

  startEditingFilter = (id, value) =>
    this.setState({ editingFilterId: id, editingFilterValue: value });
  stopEditingFilter = () => this.setState({ editingFilterId: null });
  onEditingFilterChange = e =>
    this.setState({ editingFilterValue: e.target.value });

  onEditFieldKeyDown = ({ keyCode }) => {
    if (keyCodes.ENTER === keyCode) {
      this.props.saveFilter({
        filterId: this.state.editingFilterId,
        newFilterValue: this.state.editingFilterValue,
      });
      this.stopEditingFilter();
    }
    if (keyCodes.ESCAPE === keyCode) {
      this.stopEditingFilter();
    }
  };

  getColumns() {
    const {
      deleteFilter,
      fieldWildcardMatcher,
      indexPattern,
      saveFilter,
    } = this.props;

    return [
      {
        field: 'value',
        name: 'Filter',
        description: `Filter name`,
        dataType: 'string',
        sortable: true,
        render: (value, filter) => {
          if (this.state.editingFilterId === filter.clientId) {
            return (
              <EuiFieldText
                autoFocus
                value={this.state.editingFilterValue}
                onChange={this.onEditingFilterChange}
                onKeyDown={this.onEditFieldKeyDown}
              />
            );
          }

          return <span>{value}</span>;
        },
      },
      {
        field: 'value',
        name: 'Matches',
        description: `Language used for the field`,
        dataType: 'string',
        sortable: true,
        render: (value, filter) => {
          const realtimeValue =
            this.state.editingFilterId === filter.clientId
              ? this.state.editingFilterValue
              : value;
          const matcher = fieldWildcardMatcher([realtimeValue]);
          const matches = indexPattern
            .getNonScriptedFields()
            .map(f => f.name)
            .filter(matcher)
            .sort();
          if (matches.length) {
            return <span>{matches.join(', ')}</span>;
          }

          return (
            <em>The source filter doesn&apos;t match any known fields.</em>
          );
        },
      },
      {
        name: '',
        align: RIGHT_ALIGNMENT,
        width: '100',
        render: filter => {
          if (this.state.editingFilterId === filter.clientId) {
            return (
              <Fragment>
                <EuiButtonIcon
                  size="s"
                  onClick={() => {
                    saveFilter({
                      filterId: this.state.editingFilterId,
                      newFilterValue: this.state.editingFilterValue,
                    });
                    this.stopEditingFilter();
                  }}
                  iconType="checkInCircleFilled"
                  aria-label="Save"
                />
                <EuiButtonIcon
                  size="s"
                  onClick={() => {
                    this.stopEditingFilter();
                  }}
                  iconType="cross"
                  aria-label="Cancel"
                />
              </Fragment>
            );
          }

          return (
            <Fragment>
              <EuiButtonIcon
                size="s"
                color="danger"
                onClick={() => deleteFilter(filter)}
                iconType="trash"
                aria-label="Delete"
              />
              <EuiButtonIcon
                size="s"
                onClick={() =>
                  this.startEditingFilter(filter.clientId, filter.value)
                }
                iconType="pencil"
                aria-label="Edit"
              />
            </Fragment>
          );
        },
      },
    ];
  }

  render() {
    const { items, isSaving } = this.props;
    const columns = this.getColumns();
    const pagination = {
      initialPageSize: 10,
      pageSizeOptions: [5, 10, 25, 50],
    };

    return (
      <EuiInMemoryTable
        loading={isSaving}
        items={items}
        columns={columns}
        pagination={pagination}
        sorting={true}
      />
    );
  }
}
