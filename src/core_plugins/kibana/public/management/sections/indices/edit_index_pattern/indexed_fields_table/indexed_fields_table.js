import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { Table } from './components/table';
import {
  getFieldFormat,
  getTableOfRecordsState,
  DEFAULT_TABLE_OF_RECORDS_STATE
} from './lib';


export class IndexedFieldsTable extends Component {
  static propTypes = {
    indexPattern: PropTypes.object.isRequired,
    fieldFilter: PropTypes.string,
    indexedFieldTypeFilter: PropTypes.string,
    helpers: PropTypes.shape({
      redirectToRoute: PropTypes.func.isRequired,
    }),
    fieldWildcardMatcher: PropTypes.func.isRequired,
  }

  constructor(props) {
    super(props);

    this.state = {
      fields: [],
      ...DEFAULT_TABLE_OF_RECORDS_STATE,
    };
  }

  componentWillMount() {
    this.fetchFields();
  }

  mapFields(fields) {
    const { indexPattern, fieldWildcardMatcher } = this.props;
    const fieldWildcardMatch = fieldWildcardMatcher((indexPattern.sourceFilters && indexPattern.sourceFilters.map(f => f.value) || []));

    return fields
      .map((field) => {
        return {
          ...field,
          displayName: field.displayName,
          routes: field.routes,
          indexPattern: field.indexPattern,
          format: getFieldFormat(indexPattern, field.name),
          excluded: fieldWildcardMatch ? fieldWildcardMatch(field.name) : false,
        };
      });
  }

  fetchFields = async () => {
    const fields = this.mapFields(await this.props.indexPattern.getNonScriptedFields());
    this.setState({
      fields,
      ...this.computeTableState(this.state.criteria, this.props, fields),
    });
  }

  onDataCriteriaChange = criteria => {
    this.setState(this.computeTableState(criteria));
  }

  componentWillReceiveProps(nextProps) {
    if (this.props.fieldFilter !== nextProps.fieldFilter) {
      this.setState(this.computeTableState(this.state.criteria, nextProps));
    }
    if (this.props.indexedFieldTypeFilter !== nextProps.indexedFieldTypeFilter) {
      this.setState(this.computeTableState(this.state.criteria, nextProps));
    }
  }

  computeTableState(criteria, props = this.props, fields = this.state.fields) {
    let items = fields;
    if (props.fieldFilter) {
      const fieldFilter = props.fieldFilter.toLowerCase();
      items = items.filter(field => field.name.toLowerCase().includes(fieldFilter));
    }
    if (props.indexedFieldTypeFilter) {
      items = items.filter(field => field.type === props.indexedFieldTypeFilter);
    }

    return getTableOfRecordsState(items, criteria);
  }

  render() {
    const {
      indexPattern,
    } = this.props;

    const {
      data,
      criteria: {
        page,
        sort,
      },
    } = this.state;

    const model = {
      data,
      criteria: {
        page,
        sort,
      },
    };

    return (
      <div>
        <Table
          indexPattern={indexPattern}
          model={model}
          editField={field => this.props.helpers.redirectToRoute(field, 'edit')}
          onDataCriteriaChange={this.onDataCriteriaChange}
        />
      </div>
    );
  }
}
