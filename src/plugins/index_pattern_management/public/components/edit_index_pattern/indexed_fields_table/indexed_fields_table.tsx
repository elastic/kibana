/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { Component } from 'react';
import { createSelector } from 'reselect';
import {
  IndexPatternField,
  IIndexPattern,
  IFieldType,
} from '../../../../../../plugins/data/public';
import { Table } from './components/table';
import { getFieldFormat } from './lib';
import { IndexedFieldItem } from './types';

interface IndexedFieldsTableProps {
  fields: IndexPatternField[];
  indexPattern: IIndexPattern;
  fieldFilter?: string;
  indexedFieldTypeFilter?: string;
  helpers: {
    redirectToRoute: (obj: any) => void;
    getFieldInfo: (indexPattern: IIndexPattern, field: IFieldType) => string[];
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
            ...field,
            displayName: field.displayName,
            indexPattern: field.indexPattern,
            format: getFieldFormat(indexPattern, field.name),
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
        fields = fields.filter((field) => field.name.toLowerCase().includes(normalizedFieldFilter));
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
