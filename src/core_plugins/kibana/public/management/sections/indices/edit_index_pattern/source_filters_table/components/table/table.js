import React, { Component } from 'react';
import PropTypes from 'prop-types';

import {
  EuiTableOfRecords,
  EuiFieldText,
  EuiButtonIcon,
  keyCodes,
  RIGHT_ALIGNMENT,
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
      editingFilterId: null,
      editingFilterValue: null,
    };
  }

  startEditingFilter = (id, value) => this.setState({ editingFilterId: id, editingFilterValue: value })
  stopEditingFilter = () => this.setState({ editingFilterId: null })
  onEditingFilterChange = e => this.setState({ editingFilterValue: e.target.value })

  onEditFieldKeyPressed = ({ charCode }) => {
    if (keyCodes.ENTER === charCode) {
      this.props.saveFilter({
        filterId: this.state.editingFilterId,
        newFilterValue: this.state.editingFilterValue,
      });
      this.stopEditingFilter();
    }
    if (keyCodes.ESCAPE === charCode) {
      this.stopEditingFilter();
    }
  }

  getTableConfig() {
    const {
      deleteFilter,
      onDataCriteriaChange,
      fieldWildcardMatcher,
      indexPattern,
      saveFilter,
    } = this.props;

    const actions = [];

    if (this.state.editingFilterId) {
      actions.push({
        name: 'Save',
        description: 'Save this field',
        icon: 'checkInCircleFilled',
        onClick: () => {
          saveFilter({
            filterId: this.state.editingFilterId,
            newFilterValue: this.state.editingFilterValue,
          });
          this.stopEditingFilter();
        }
      });
      actions.push({
        name: 'Cancel',
        description: 'Cancel editing this field',
        icon: 'cross',
        onClick: () => {
          this.stopEditingFilter();
        }
      });
    }
    else {
      actions.push({
        name: 'Edit',
        description: 'Edit this field',
        icon: 'pencil',
        onClick: filter => this.startEditingFilter(filter.clientId, filter.value)
      });
      actions.push({
        name: 'Delete',
        description: 'Delete this field',
        icon: 'trash',
        color: 'danger',
        onClick: deleteFilter,
      });
    }

    return {
      recordId: 'clientId',
      columns: [
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
                  value={this.state.editingFilterValue}
                  onChange={this.onEditingFilterChange}
                  onKeyPress={this.onEditFieldKeyPressed}
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
          align: RIGHT_ALIGNMENT,
          width: '100',
          render: (filter) => {
            if (this.state.editingFilterId) {
              return (
                <div>
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
                </div>
              );
            }

            return (
              <div>
                <EuiButtonIcon
                  size="s"
                  color="danger"
                  onClick={() => deleteFilter(filter)}
                  iconType="trash"
                  aria-label="Delete"
                />
                <EuiButtonIcon
                  size="s"
                  onClick={() => this.startEditingFilter(filter.clientId, filter.value)}
                  iconType="pencil"
                  aria-label="Edit"
                />
              </div>
            );
          },
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
