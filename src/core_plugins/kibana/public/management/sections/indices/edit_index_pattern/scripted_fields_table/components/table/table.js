import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import {
  EuiTableOfRecords
} from '@elastic/eui';

export class Table extends PureComponent {
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
    editField: PropTypes.func.isRequired,
    deleteField: PropTypes.func.isRequired,
    onDataCriteriaChange: PropTypes.func.isRequired,
  }

  renderFormatCell = (value) => {
    const { indexPattern } = this.props;

    const title = indexPattern.fieldFormatMap[value] && indexPattern.fieldFormatMap[value].type
      ? indexPattern.fieldFormatMap[value].type.title
      : '';

    return (
      <span>{title}</span>
    );
  }

  getTableConfig() {
    const { editField, deleteField, onDataCriteriaChange } = this.props;

    return {
      recordId: 'name',
      columns: [
        {
          field: 'displayName',
          name: 'Name',
          description: `Name of the field`,
          dataType: 'string',
          sortable: true,
        },
        {
          field: 'lang',
          name: 'Lang',
          description: `Language used for the field`,
          dataType: 'string',
          sortable: true,
          render: value => {
            return (
              <span data-test-subj="scriptedFieldLang">
                {value}
              </span>
            );
          }
        },
        {
          field: 'script',
          name: 'Script',
          description: `Script for the field`,
          dataType: 'string',
          sortable: true,
        },
        {
          field: 'name',
          name: 'Format',
          description: `Format used for the field`,
          render: this.renderFormatCell,
          sortable: false,
        },
        {
          name: '',
          actions: [
            {
              name: 'Edit',
              description: 'Edit this field',
              icon: 'pencil',
              onClick: editField,
            },
            {
              name: 'Delete',
              description: 'Delete this field',
              icon: 'trash',
              color: 'danger',
              onClick: deleteField,
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
