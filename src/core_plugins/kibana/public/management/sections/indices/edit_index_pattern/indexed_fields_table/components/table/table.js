import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiTableOfRecords,
  TooltipTrigger
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
    }).isRequired,
    editField: PropTypes.func.isRequired,
    onDataCriteriaChange: PropTypes.func.isRequired,
  }

  renderBooleanTemplate(value) {
    return value ? <EuiIcon type="dot" color="secondary" /> : <span/>;
  }

  renderFieldName(name, isTimeField) {
    return (
      <div data-test-subj="indexedFieldName">
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            {name}
          </EuiFlexItem>
          {isTimeField ? (
            <EuiFlexItem>
              <TooltipTrigger tooltip="This field represents the time that events occurred.">
                <EuiIcon type="clock" color="primary" />
              </TooltipTrigger>
            </EuiFlexItem>
          ) : ''}
        </EuiFlexGroup>
      </div>
    );
  }

  renderFieldType(type, isConflict) {
    return (
      <div data-test-subj="indexedFieldType">
        <EuiFlexGroup alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            {type}
          </EuiFlexItem>
          {isConflict ? (
            <EuiFlexItem>
              <TooltipTrigger tooltip="The type of this field changes across indices. It is unavailable for many analysis functions.">
                <EuiIcon type="alert" color="warning" />
              </TooltipTrigger>
            </EuiFlexItem>
          ) : ''}
        </EuiFlexGroup>
      </div>
    );
  }

  getTableConfig() {
    const { indexPattern, editField, onDataCriteriaChange } = this.props;

    return {
      recordId: 'name',
      columns: [
        {
          field: 'displayName',
          name: 'Name',
          dataType: 'string',
          sortable: true,
          render: (value) => {
            return this.renderFieldName(value, indexPattern.timeFieldName === value);
          },
        },
        {
          field: 'type',
          name: 'Type',
          dataType: 'string',
          sortable: true,
          render: (value) => {
            return this.renderFieldType(value, value === 'conflict');
          },
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
          render: this.renderBooleanTemplate,
        },
        {
          field: 'aggregatable',
          name: 'Aggregatable',
          description: `These fields can be used in visualization aggregations`,
          dataType: 'boolean',
          sortable: true,
          render: this.renderBooleanTemplate,
        },
        {
          field: 'excluded',
          name: 'Excluded',
          description: `Fields that are excluded from _source when it is fetched`,
          dataType: 'boolean',
          sortable: true,
          render: this.renderBooleanTemplate,
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
