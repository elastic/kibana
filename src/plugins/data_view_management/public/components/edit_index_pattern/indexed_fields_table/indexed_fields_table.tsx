/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React, { Component } from 'react';
import { createSelector } from 'reselect';
import { OverlayStart, ThemeServiceStart } from '@kbn/core/public';
import { DataViewField, DataView, RuntimeField } from '@kbn/data-views-plugin/public';
import { Table } from './components/table';
import { IndexedFieldItem } from './types';

interface IndexedFieldsTableProps {
  fields: DataViewField[];
  indexPattern: DataView;
  fieldFilter?: string;
  indexedFieldTypeFilter: string[];
  schemaFieldTypeFilter: string[];
  helpers: {
    editField: (fieldName: string) => void;
    deleteField: (fieldName: string[]) => void;
    getFieldInfo: (indexPattern: DataView, field: DataViewField) => string[];
  };
  fieldWildcardMatcher: (filters: string[] | undefined) => (val: string) => boolean;
  userEditPermission: boolean;
  openModal: OverlayStart['openModal'];
  theme: ThemeServiceStart;
  compositeRuntimeFields: Record<string, RuntimeField>;
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
      fields: [
        ...this.mapCompositeRuntimeFields(this.props.compositeRuntimeFields),
        ...this.mapFields(this.props.fields),
      ],
    };
  }

  UNSAFE_componentWillReceiveProps(nextProps: IndexedFieldsTableProps) {
    if (
      nextProps.fields !== this.props.fields ||
      nextProps.compositeRuntimeFields !== this.props.compositeRuntimeFields
    ) {
      this.setState({
        fields: [
          ...this.mapCompositeRuntimeFields(nextProps.compositeRuntimeFields),
          ...this.mapFields(nextProps.fields),
        ],
      });
    }
  }

  mapFields(fields: DataViewField[]): IndexedFieldItem[] {
    const { indexPattern, fieldWildcardMatcher, helpers, userEditPermission } = this.props;
    const sourceFilters =
      indexPattern.sourceFilters &&
      indexPattern.sourceFilters.map((f: Record<string, any>) => f.value);
    const fieldWildcardMatch = fieldWildcardMatcher(sourceFilters || []);

    return (
      (fields &&
        fields.map((field) => {
          return {
            ...field.spec,
            type: field.esTypes?.join(', ') || '',
            kbnType: field.type,
            displayName: field.displayName,
            format: indexPattern.getFormatterForFieldNoDefault(field.name)?.type?.title || '',
            excluded: fieldWildcardMatch ? fieldWildcardMatch(field.name) : false,
            info: helpers.getFieldInfo && helpers.getFieldInfo(indexPattern, field),
            isMapped: !!field.isMapped,
            isUserEditable: userEditPermission,
            hasRuntime: !!field.runtimeField,
          };
        })) ||
      []
    );
  }

  mapCompositeRuntimeFields(
    compositeRuntimeFields: Record<string, RuntimeField>
  ): IndexedFieldItem[] {
    const { indexPattern, fieldWildcardMatcher, userEditPermission } = this.props;
    const sourceFilters =
      indexPattern.sourceFilters &&
      indexPattern.sourceFilters.map((f: Record<string, any>) => f.value);
    const fieldWildcardMatch = fieldWildcardMatcher(sourceFilters || []);

    return Object.entries(compositeRuntimeFields).map(([name, fld]) => {
      return {
        spec: {
          searchable: false,
          aggregatable: false,
          name,
          type: 'composite',
          runtimeField: {
            type: 'composite',
            script: fld.script,
            fields: fld.fields,
          },
        },
        name,
        type: 'composite',
        kbnType: '',
        displayName: name,
        excluded: fieldWildcardMatch ? fieldWildcardMatch(name) : false,
        info: [],
        isMapped: false,
        isUserEditable: userEditPermission,
        hasRuntime: true,
        runtimeField: {
          type: 'composite',
          script: fld.script,
          fields: fld.fields,
        },
      };
    });
  }

  getFilteredFields = createSelector(
    (state: IndexedFieldsTableState) => state.fields,
    (_state: IndexedFieldsTableState, props: IndexedFieldsTableProps) => props.fieldFilter,
    (_state: IndexedFieldsTableState, props: IndexedFieldsTableProps) =>
      props.indexedFieldTypeFilter,
    (_state: IndexedFieldsTableState, props: IndexedFieldsTableProps) =>
      props.schemaFieldTypeFilter,
    (fields, fieldFilter, indexedFieldTypeFilter, schemaFieldTypeFilter) => {
      if (fieldFilter) {
        const normalizedFieldFilter = fieldFilter.toLowerCase();
        fields = fields.filter(
          (field) =>
            field.name.toLowerCase().includes(normalizedFieldFilter) ||
            (field.displayName && field.displayName.toLowerCase().includes(normalizedFieldFilter))
        );
      }

      if (indexedFieldTypeFilter.length) {
        // match conflict fields
        fields = fields.filter((field) => {
          if (indexedFieldTypeFilter.includes('conflict') && field.kbnType === 'conflict') {
            return true;
          }
          if (
            'runtimeField' in field &&
            field.runtimeField?.type &&
            indexedFieldTypeFilter.includes(field.runtimeField?.type)
          ) {
            return true;
          }
          // match one of multiple types on a field
          return (
            field.esTypes?.length &&
            field.esTypes.filter((val) => indexedFieldTypeFilter.includes(val)).length
          );
        });
      }

      if (schemaFieldTypeFilter.length) {
        // match fields of schema type
        fields = fields.filter((field) => {
          return (
            (schemaFieldTypeFilter.includes('runtime') && 'runtimeField' in field) ||
            (schemaFieldTypeFilter.includes('indexed') && !('runtimeField' in field))
          );
        });
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
          editField={(field) => this.props.helpers.editField(field.name)}
          deleteField={(fieldNames) => this.props.helpers.deleteField(fieldNames)}
          openModal={this.props.openModal}
          theme={this.props.theme}
        />
      </div>
    );
  }
}
