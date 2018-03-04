import React, { Component } from 'react';
import PropTypes from 'prop-types';

import { Table } from './components/table';
import {
  getFieldFormat
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
      fields: []
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
      fields
    });
  }

  getFilteredItems() {
    const { fields } = this.state;
    const { fieldFilter, indexedFieldTypeFilter } = this.props;
    let filteredFields = fields;

    if (fieldFilter) {
      const normalizedFieldFilter = fieldFilter.toLowerCase();
      filteredFields = filteredFields.filter(field => field.name.toLowerCase().includes(normalizedFieldFilter));
    }
    if (indexedFieldTypeFilter) {
      filteredFields = filteredFields.filter(field => field.type === indexedFieldTypeFilter);
    }

    return filteredFields;
  }

  render() {
    const {
      indexPattern,
    } = this.props;

    const items = this.getFilteredItems();

    return (
      <div>
        <Table
          indexPattern={indexPattern}
          items={items}
          editField={field => this.props.helpers.redirectToRoute(field, 'edit')}
        />
      </div>
    );
  }
}
