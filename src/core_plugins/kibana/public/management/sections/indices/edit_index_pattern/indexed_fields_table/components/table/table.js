import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import {
  EuiIcon,
  EuiInMemoryTable,
  EuiIconTip,
} from '@elastic/eui';

export class Table extends PureComponent {
  static propTypes = {
    indexPattern: PropTypes.object.isRequired,
    items: PropTypes.array.isRequired,
    editField: PropTypes.func.isRequired
  }

  renderBooleanTemplate(value, label) {
    return value ? <EuiIcon type="dot" color="secondary" aria-label={label}/> : <span/>;
  }

  renderFieldName(name, isTimeField) {
    return (
      <span>
        {name}
        {isTimeField ? (
          <span>
            &nbsp;
            <EuiIconTip
              type="clock"
              color="primary"
              aria-label="Primary time field"
              content="This field represents the time that events occurred."
            />
          </span>
        ) : ''}
      </span>
    );
  }

  renderFieldType(type, isConflict) {
    return (
      <span>
        {type}
        {isConflict ? (
          <span>
            &nbsp;
            <EuiIconTip
              type="alert"
              color="warning"
              aria-label="Multiple type field"
              content="The type of this field changes across indices. It is unavailable for many analysis functions."
            />
          </span>
        ) : ''}
      </span>
    );
  }

  render() {
    const { indexPattern, items, editField } = this.props;

    const pagination = {
      initialPageSize: 10,
      pageSizeOptions: [5, 10, 25, 50]
    };

    const columns = [
      {
        field: 'displayName',
        name: 'Name',
        dataType: 'string',
        sortable: true,
        render: (value) => {
          return this.renderFieldName(value, indexPattern.timeFieldName === value);
        },
        width: '38%',
        'data-test-subj': 'indexedFieldName',
      },
      {
        field: 'type',
        name: 'Type',
        dataType: 'string',
        sortable: true,
        render: (value) => {
          return this.renderFieldType(value, value === 'conflict');
        },
        'data-test-subj': 'indexedFieldType',
      },
      {
        field: 'format',
        name: 'Format',
        dataType: 'string',
        sortable: true,
      },
      {
        field: 'searchable',
        name: 'Searchable',
        description: `These fields can be used in the filter bar`,
        dataType: 'boolean',
        sortable: true,
        render: (value) => this.renderBooleanTemplate(value, 'Is searchable'),
      },
      {
        field: 'aggregatable',
        name: 'Aggregatable',
        description: `These fields can be used in visualization aggregations`,
        dataType: 'boolean',
        sortable: true,
        render: (value) => this.renderBooleanTemplate(value, 'Is aggregatable'),
      },
      {
        field: 'excluded',
        name: 'Excluded',
        description: `Fields that are excluded from _source when it is fetched`,
        dataType: 'boolean',
        sortable: true,
        render: (value) => this.renderBooleanTemplate(value, 'Is excluded'),
      },
      {
        name: '',
        actions: [
          {
            name: 'Edit',
            description: 'Edit',
            icon: 'pencil',
            onClick: editField,
            type: 'icon',
          },
        ],
        width: '40px',
      }
    ];

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
