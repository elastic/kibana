import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import {
  EuiInMemoryTable
} from '@elastic/eui';

export class Table extends PureComponent {
  static propTypes = {
    items: PropTypes.array.isRequired,
  }

  getColumns() {
    return [
      {
        field: 'title',
        name: 'Title',
        description: `Title of the saved object`,
        dataType: 'string',
        sortable: true,
      }
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
    const { items } = this.props;
    const columns = this.getColumns();
    const pagination = {
      pageSizeOptions: [5, 10, 25, 50],
    };

    return (
      <EuiInMemoryTable
        items={items}
        columns={columns}
        pagination={pagination}
        sorting={true}
      />
    );
  }
}
