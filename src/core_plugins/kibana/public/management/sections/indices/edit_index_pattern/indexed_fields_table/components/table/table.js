import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';

import {
  EuiHealth,
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
  };

  renderBooleanTemplate(value) {
    return value ? <EuiHealth color="success"/> : '';
  }

  getTableConfig() {
    const { editField, deleteField, onDataCriteriaChange } = this.props;

    return {
      recordId: 'name',
      columns: [
        {
          field: 'displayName',
          name: 'Name',
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
          render: this.booleanTemplate,
        },
        {
          field: 'excluded',
          name: 'Excluded',
          description: `Fields that are excluded from _source when it is fetched`,
          dataType: 'boolean',
          sortable: true,
          render: this.booleanTemplate,
        },
        {
          name: '',
          actions: [
            {
              name: 'Edit',
              description: 'Edit',
              icon: 'pencil',
              onClick: editField,
            },
            {
              name: 'Delete',
              description: 'Delete',
              icon: 'trash',
              color: 'danger',
              onClick: deleteField,
              available: (record) => record.scripted,
            },
          ]
        }
      ],
      pagination: {
        pageSizeOptions: [25, 50, 100]
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


// import React, { Component } from 'react';
// import PropTypes from 'prop-types';
// import {
//   booleanTemplate,
//   fieldWildcardProvider,
//   getFieldFormat
// } from '../../lib/index';
//
// import {
//   EuiTableOfRecords
// } from '@elastic/eui';
//
// export class IndexedFieldsTable extends Component {
//   static propTypes = {
//     indexPattern: PropTypes.object.isRequired,
//     fieldFilter: PropTypes.string,
//     typeFilter: PropTypes.string,
//   }
//
//   static defaultProps = {
//   }
//
//   constructor(props) {
//     super(props);
//     this.state = this.computeTableState({
//       page: {
//         index: 0,
//         size: 25
//       }
//     }, this.props);
//   }
//
//   computeTableState(criteria, props) {
//     return {
//       fields: this.mapFields(props.indexPattern.getNonScriptedFields(), props),
//       criteria: criteria ? {
//         page: {
//           index: 0,
//           size: 25
//         },
//         sort: criteria.sort
//       } : this.state.criteria
//     };
//   }
//
//   mapFields(fields, props) {
//     const { indexPattern, fieldFilter, typeFilter } = props;
//     const { fieldWildcardMatcher } = fieldWildcardProvider({
//       metaFields: indexPattern.metaFields
//     });
//     const fieldWildcardMatch = fieldWildcardMatcher((indexPattern.sourceFilters && indexPattern.sourceFilters.map(f => f.value) || []));
//
//     return fields
//       .filter((field) => {
//         if(typeFilter && field.type !== typeFilter) {
//           return false;
//         }
//
//         if(fieldFilter && field.name.indexOf(fieldFilter) === -1) {
//           return false;
//         }
//
//         return true;
//       })
//       .map((field) => {
//         return {
//           ...field,
//           displayName: field.displayName,
//           format: getFieldFormat(indexPattern, field.name),
//           excluded: fieldWildcardMatch(field.name),
//         };
//       });
//   }
//
//   onDataCriteriaChange(criteria) {
//     this.setState(this.computeTableState(criteria, this.props));
//   }
//
//   componentWillReceiveProps(nextProps) {
//     this.setState(this.computeTableState(null, nextProps));
//   }
//
//   render() {
//     const model = {
//       data: {
//         records: this.state.fields,
//         totalRecordCount: this.state.fields.length
//       }
//     };
//
//     const config = {
//       recordId: 'name',
//       // pagination: {
//       //   pageSizeOptions: [25, 50, 100]
//       // },
//       onDataCriteriaChange: (criteria) => this.onDataCriteriaChange(criteria),
//       columns: [
//         {
//           field: 'displayName',
//           name: 'Field',
//           dataType: 'string',
//           sortable: true,
//         },
//         {
//           field: 'type',
//           name: 'Type',
//           dataType: 'string',
//           sortable: true,
//         },
//         {
//           field: 'format',
//           name: 'Format',
//           dataType: 'string',
//           sortable: true,
//         },
//         {
//           field: 'searchable',
//           name: 'Searchable',
//           description: 'These fields can be used in the filter bar',
//           dataType: 'boolean',
//           sortable: true,
//           render: booleanTemplate,
//         },
//         {
//           field: 'aggregatable',
//           name: 'Aggregatable',
//           description: 'These fields can be used in visualization aggregations',
//           dataType: 'boolean',
//           sortable: true,
//           render: booleanTemplate,
//         },
//         {
//           field: 'excluded',
//           name: 'Excluded',
//           description: 'Fields that are excluded from _source when it is fetched',
//           dataType: 'boolean',
//           sortable: true,
//           render: booleanTemplate,
//         },
//         {
//           name: '',
//           actions: [
//             {
//               name: 'Edit',
//               description: 'Edit',
//               icon: 'pencil',
//               type: 'icon',
//               onClick: () => {},
//             },
//             {
//               name: 'Delete',
//               description: 'Delete',
//               icon: 'trash',
//               type: 'icon',
//               available: (record) => record.scripted,
//               onClick: () => {},
//             },
//           ]
//         },
//       ]
//     };
//
//     return (
//       <div>
//         <EuiTableOfRecords config={config} model={model}/>
//       </div>
//     );
//   }
// }
