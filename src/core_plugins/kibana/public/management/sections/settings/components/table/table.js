import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import {
  EuiInMemoryTable
} from '@elastic/eui';

export class Table extends PureComponent {
  static propTypes = {
    config: PropTypes.array,
  }

  render() {
    const items = [];
    const columns = [
      {
        field: 'name',
        name: 'Name',
        dataType: 'string'
      },
      {
        field: 'value',
        name: 'Value',
        dataType: 'string',
      },
      {
        name: '',
        actions: [
          {
            name: 'Edit',
            description: 'Edit',
            icon: 'pencil',
            onClick: () => {},
            type: 'icon',
          },
        ],
      }
    ];

    return (
      <EuiInMemoryTable
        items={items}
        columns={columns}
        sorting={false}
      />
    );
  }
}
