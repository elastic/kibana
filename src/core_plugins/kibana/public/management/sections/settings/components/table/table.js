import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import {
  EuiBasicTable,
  EuiText,
  EuiImage,
} from '@elastic/eui';

import ReactMarkdown from 'react-markdown';

export class Table extends PureComponent {
  static propTypes = {
    items: PropTypes.array.isRequired,
  }

  renderNameAndDescription(name, description) {
    return (
      <div>
        <EuiText>
          <h3>{name}</h3>
          <p>{description}</p>
        </EuiText>
      </div>
    );
  }

  getValue(item) {
    if(item.normal || item.json || item.select) {
      return item.value || item.defVal;
    }

    if(item.array) {
      return (item.value || item.defVal).join(', ');
    }

    if(item.bool) {
      return item.value === undefined ? item.defVal : item.value;
    }

    if(item.markdown) {
      return (
        <ReactMarkdown source={item.value} />
      );
    }

    if(item.image && item.value) {
      return (
        <EuiImage url={item.value} />
      );
    }

    return item.value;
  }

  renderValue(value, item) {
    return (
      <div>
        <EuiText>
          {this.getValue(item)}
        </EuiText>
      </div>
    );
  }

  render() {
    const { items } = this.props;

    const columns = [
      {
        field: 'name',
        name: 'Name',
        dataType: 'string',
        render: (value, item) => this.renderNameAndDescription(item.name, item.description)
      },
      {
        field: 'value',
        name: 'Value',
        dataType: 'string',
        render: (value, item) => this.renderValue(value, item)
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
      },
    ];

    return (
      <EuiBasicTable
        items={items}
        columns={columns}
      />
    );
  }
}
