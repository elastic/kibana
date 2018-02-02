import React, { Component } from 'react';
import PropTypes from 'prop-types';
import {
  booleanTemplate,
  getFieldFormat
} from '../../lib';

import {
  EuiTableOfRecords
} from '@elastic/eui';

export class IndexedFieldsTable extends Component {
  static propTypes = {
    indexPattern: PropTypes.object.isRequired,
  }

  static defaultProps = {
  }

  constructor(props) {
    super(props);
    this.state = this.computeTableState({
      page: {
        index: 0,
        size: 25
      }
    });
  }

  computeTableState(criteria) {
    return {
      data: {
        records: this.mapFields(this.props.indexPattern.getNonScriptedFields()),
        totalRecordCount: this.props.indexPattern.getNonScriptedFields().length
      },
      criteria: {
        page: {
          index: 0,
          size: 25
        },
        sort: criteria.sort
      }
    };
  }

  mapFields(fields) {
    return fields.map((field) => {
      return {
        ...field,
        displayName: field.displayName,
        format: getFieldFormat(this.props.indexPattern, field.name),
        excluded: false //todo: fix this
      };
    });
  }

  onDataCriteriaChange(criteria) {
    this.setState(this.computeTableState(criteria));
  }

  render() {
    const model = {
      data: this.state.data
    };

    const config = {
      recordId: 'name',
      // pagination: {
      //   pageSizeOptions: [25, 50, 100]
      // },
      onDataCriteriaChange: (criteria) => this.onDataCriteriaChange(criteria),
      columns: [
        {
          field: 'displayName',
          name: 'Field',
          dataType: 'string',
          sortable: true,
        },
        {
          field: 'type',
          name: 'Type',
          dataType: 'string',
          sortable: true,
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
          dataType: 'boolean',
          sortable: true,
          render: booleanTemplate,
        },
        {
          field: 'aggregatable',
          name: 'Aggregatable',
          dataType: 'boolean',
          sortable: true,
          render: booleanTemplate,
        },
        {
          field: 'excluded',
          name: 'excluded',
          dataType: 'boolean',
          sortable: true,
          render: booleanTemplate,
        },
        {
          name: '',
          actions: [
            {
              name: 'Edit',
              description: 'Edit',
              icon: 'pencil',
              type: 'icon',
              onClick: () => {},
            },
            {
              name: 'Delete',
              description: 'Delete',
              icon: 'trash',
              type: 'icon',
              available: (record) => record.scripted,
              onClick: () => {},
            },
          ]
        },
      ]
    };

    // console.log('jen', fields);

    return (
      <div>
        <EuiTableOfRecords config={config} model={model}/>
      </div>
    );
  }
}
