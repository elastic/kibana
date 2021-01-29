/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import React, { Component } from 'react';
import { createSelector } from 'reselect';
import { IndexPatternField, IndexPattern, IFieldType } from '../../../../../../plugins/data/public';
import { Table } from './components/table';
import { IndexedFieldItem } from './types';

interface IndexedFieldsTableProps {
  fields: IndexPatternField[];
  indexPattern: IndexPattern;
  fieldFilter?: string;
  indexedFieldTypeFilter?: string;
  helpers: {
    redirectToRoute: (obj: any) => void;
    getFieldInfo: (indexPattern: IndexPattern, field: IFieldType) => string[];
  };
  fieldWildcardMatcher: (filters: any[]) => (val: any) => boolean;
}

interface IndexedFieldsTableState {
  fields: IndexedFieldItem[];
}

export class IndexedFieldsTable extends Component<
  IndexedFieldsTableProps,
  IndexedFieldsTableState
> {
  constructor(props: IndexedFieldsTableProps) {
    super(props);

    this.state = {
      fields: this.mapFields(this.props.fields),
    };
  }

  UNSAFE_componentWillReceiveProps(nextProps: IndexedFieldsTableProps) {
    if (nextProps.fields !== this.props.fields) {
      this.setState({
        fields: this.mapFields(nextProps.fields),
      });
    }
  }

  mapFields(fields: IndexPatternField[]): IndexedFieldItem[] {
    const { indexPattern, fieldWildcardMatcher, helpers } = this.props;
    const sourceFilters =
      indexPattern.sourceFilters &&
      indexPattern.sourceFilters.map((f: Record<string, any>) => f.value);
    const fieldWildcardMatch = fieldWildcardMatcher(sourceFilters || []);

    return (
      (fields &&
        fields.map((field) => {
          return {
            ...field.spec,
            displayName: field.displayName,
            format: indexPattern.getFormatterForFieldNoDefault(field.name)?.type?.title || '',
            excluded: fieldWildcardMatch ? fieldWildcardMatch(field.name) : false,
            info: helpers.getFieldInfo && helpers.getFieldInfo(indexPattern, field),
          };
        })) ||
      []
    );
  }

  getFilteredFields = createSelector(
    (state: IndexedFieldsTableState) => state.fields,
    (state: IndexedFieldsTableState, props: IndexedFieldsTableProps) => props.fieldFilter,
    (state: IndexedFieldsTableState, props: IndexedFieldsTableProps) =>
      props.indexedFieldTypeFilter,
    (fields, fieldFilter, indexedFieldTypeFilter) => {
      if (fieldFilter) {
        const normalizedFieldFilter = fieldFilter.toLowerCase();
        fields = fields.filter(
          (field) =>
            field.name.toLowerCase().includes(normalizedFieldFilter) ||
            (field.displayName && field.displayName.toLowerCase().includes(normalizedFieldFilter))
        );
      }

      if (indexedFieldTypeFilter) {
        fields = fields.filter((field) => field.type === indexedFieldTypeFilter);
      }

      return fields;
    }
  );

  render() {
    const { indexPattern } = this.props;
    const fields = this.getFilteredFields(this.state, this.props);

    return (
      <div>
        <Table
          indexPattern={indexPattern}
          items={fields}
          editField={(field) => this.props.helpers.redirectToRoute(field)}
        />
      </div>
    );
  }
}
