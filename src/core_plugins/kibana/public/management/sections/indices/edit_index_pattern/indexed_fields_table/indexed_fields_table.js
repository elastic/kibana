import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { createSelector } from 'reselect';

import { Table } from './components/table';
import {
  getFieldFormat
} from './lib';

export class IndexedFieldsTable extends Component {
  static propTypes = {
    fields: PropTypes.array.isRequired,
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
      fields: this.mapFields(this.props.fields)
    };
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.fields !== this.props.fields) {
      this.setState({
        fields: this.mapFields(nextProps.fields)
      });
    }
  }

  mapFields(fields) {
    const { indexPattern, fieldWildcardMatcher } = this.props;
    const sourceFilters = indexPattern.sourceFilters && indexPattern.sourceFilters.map(f => f.value);
    const fieldWildcardMatch = fieldWildcardMatcher(sourceFilters || []);

    return fields && fields
      .map((field) => {
        return {
          ...field,
          displayName: field.displayName,
          routes: field.routes,
          indexPattern: field.indexPattern,
          format: getFieldFormat(indexPattern, field.name),
          excluded: fieldWildcardMatch ? fieldWildcardMatch(field.name) : false,
        };
      }) || [];
  }

  getFilteredFields = createSelector(
    (state) => state.fields,
    (state, props) => props.fieldFilter,
    (state, props) => props.indexedFieldTypeFilter,
    (fields, fieldFilter, indexedFieldTypeFilter) => {
      if (fieldFilter) {
        const normalizedFieldFilter = fieldFilter.toLowerCase();
        fields = fields.filter(field => field.name.toLowerCase().includes(normalizedFieldFilter));
      }

      if (indexedFieldTypeFilter) {
        fields = fields.filter(field => field.type === indexedFieldTypeFilter);
      }

      return fields;
    }
  );

  render() {
    const {
      indexPattern,
    } = this.props;

    const fields = this.getFilteredFields(this.state, this.props);

    return (
      <div>
        <Table
          indexPattern={indexPattern}
          items={fields}
          editField={field => this.props.helpers.redirectToRoute(field, 'edit')}
        />
      </div>
    );
  }
}
