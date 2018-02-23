import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import {
  EuiBasicTable
} from '@elastic/eui';

export class Table extends PureComponent {
  static propTypes = {
    indexPattern: PropTypes.object.isRequired,
    itemsOnPage: PropTypes.array.isRequired,
    totalItemCount: PropTypes.number.isRequired,
    pageIndex: PropTypes.number.isRequired,
    pageSize: PropTypes.number.isRequired,
    sortField: PropTypes.string.isRequired,
    sortDirection: PropTypes.string.isRequired,
    editField: PropTypes.func.isRequired,
    deleteField: PropTypes.func.isRequired,
    onChange: PropTypes.func.isRequired,
  }

  onChange = ({ page = {}, sort = {} }) => {
    const {
      index: pageIndex,
      size: pageSize,
    } = page;

    const {
      field: sortField,
      direction: sortDirection,
    } = sort;

    this.props.onChange(pageIndex, pageSize, sortField, sortDirection);
  };

  renderFormatCell = (value) => {
    const { indexPattern } = this.props;

    const title = indexPattern.fieldFormatMap[value] && indexPattern.fieldFormatMap[value].type
      ? indexPattern.fieldFormatMap[value].type.title
      : '';

    return (
      <span>{title}</span>
    );
  }

  render() {
    const {
      itemsOnPage,
      totalItemCount,
      pageIndex,
      pageSize,
      sortField,
      sortDirection,
      editField,
      deleteField,
    } = this.props;

    const columns = [{
      field: 'displayName',
      name: 'Name',
      description: `Name of the field`,
      dataType: 'string',
      sortable: true,
    }, {
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
    }, {
      field: 'script',
      name: 'Script',
      description: `Script for the field`,
      dataType: 'string',
      sortable: true,
    }, {
      field: 'name',
      name: 'Format',
      description: `Format used for the field`,
      render: this.renderFormatCell,
      sortable: false,
    }, {
      name: '',
      actions: [{
        name: 'Edit',
        description: 'Edit this field',
        icon: 'pencil',
        onClick: editField,
      }, {
        name: 'Delete',
        description: 'Delete this field',
        icon: 'trash',
        color: 'danger',
        onClick: deleteField,
      }],
    }];

    const pagination = {
      pageIndex,
      pageSize,
      totalItemCount,
      pageSizeOptions: [5, 10, 25, 50],
    };

    const sorting = {
      sort: {
        field: sortField,
        direction: sortDirection,
      },
    };

    return (
      <EuiBasicTable
        items={itemsOnPage}
        columns={columns}
        pagination={pagination}
        sorting={sorting}
        onChange={this.onChange}
      />
    );
  }
}
