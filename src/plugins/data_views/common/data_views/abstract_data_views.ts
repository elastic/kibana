/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type {
  FieldFormat,
  FieldFormatsStartCommon,
  SerializedFieldFormat,
} from '@kbn/field-formats-plugin/common';
import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/field-types';
import type {
  DataViewSpec,
  FieldSpec,
  FieldFormatMap,
  RuntimeFieldSpec,
  SourceFilter,
  TypeMeta,
} from '../types';

import type { DataViewAttributes, FieldAttrs, FieldAttrSet } from '..';

import type { DataViewField } from '../fields';

// copied from data_view
interface SavedObjectBody {
  fieldAttrs?: string;
  title?: string;
  timeFieldName?: string;
  fields?: string;
  sourceFilters?: string;
  fieldFormatMap?: string;
  typeMeta?: string;
  type?: string;
}

interface AbstractDataViewDeps {
  spec?: DataViewSpec;
  fieldFormats: FieldFormatsStartCommon;
  shortDotsEnable?: boolean;
  metaFields?: string[];
}

export abstract class AbstractDataView {
  /**
   * Saved object id
   */
  public id?: string;
  /**
   * Title of data view
   * @deprecated use getIndexPattern instead
   */
  public title: string = '';
  /**
   * Map of field formats by field name
   */
  // @ts-expect-error
  public fieldFormatMap: FieldFormatMap;
  /**
   * Only used by rollup indices, used by rollup specific endpoint to load field list.
   */
  public typeMeta?: TypeMeta;

  /**
   * Timestamp field name
   */
  public timeFieldName: string | undefined;
  /**
   * Type is used to identify rollup index patterns.
   */
  public type: string | undefined;
  /**
   * @deprecated Use `flattenHit` utility method exported from data plugin instead.
   */
  // @ts-expect-error
  public flattenHit: (hit: Record<string, unknown[]>, deep?: boolean) => Record<string, unknown>;
  /**
   * List of meta fields by name
   */
  // @ts-expect-error
  public metaFields: string[];
  /**
   * SavedObject version
   */
  public version: string | undefined;
  /**
   * Array of filters - hides fields in discover
   */
  public sourceFilters?: SourceFilter[];
  /**
   * Array of namespace ids
   */
  // @ts-expect-error
  public namespaces: string[];
  /**
   * Original saved object body. Used to check for saved object changes.
   */
  protected originalSavedObjectBody: SavedObjectBody = {};
  /**
   * Returns true if short dot notation is enabled
   */
  protected shortDotsEnable: boolean = false;
  /**
   * FieldFormats service interface
   */
  protected fieldFormats: FieldFormatsStartCommon;
  /**
   * Map of field attributes by field name. Currently count and customLabel.
   */
  // @ts-expect-error
  protected fieldAttrs: FieldAttrs;
  /**
   * Map of runtime field definitions by field name
   */
  // @ts-expect-error
  protected runtimeFieldMap: Record<string, RuntimeFieldSpec>;
  /**
   * Prevents errors when index pattern exists before indices
   */
  public readonly allowNoIndex: boolean = false;
  /**
   * Name of the data view. Human readable name used to differentiate data view.
   */
  public name: string = '';

  /*
   * list of indices that the index pattern matched
   */
  public matchedIndices: string[] = [];

  /** NEW ITEMS */

  protected scriptedFields: FieldSpec[];

  // HOW IS THIS SAVED
  protected fieldAttrsSet?: Record<string, FieldAttrSet>;

  constructor({ spec, fieldFormats }: AbstractDataViewDeps) {
    // set dependencies
    this.fieldFormats = { ...fieldFormats };

    this.allowNoIndex = spec?.allowNoIndex || false;
    // CRUD operations on scripted fields need to be examined
    this.scriptedFields = spec?.fields
      ? Object.values(spec.fields).filter((field) => field.scripted)
      : [];
    // CRUD operations on field attributes need to be examined
    this.fieldAttrsSet = spec?.fieldAttrs;
  }

  /**
   * Get name of Data View
   */
  getName = () => (this.name ? this.name : this.title);

  /**
   * Get index pattern
   * @returns index pattern string
   */

  getIndexPattern = () => this.title;

  /**
   * Set index pattern
   * @param string index pattern string
   */

  setIndexPattern = (indexPattern: string) => {
    this.title = indexPattern;
  };

  /**
   * Get last saved saved object fields
   */
  getOriginalSavedObjectBody = () => ({ ...this.originalSavedObjectBody });

  /**
   * Reset last saved saved object fields. Used after saving.
   */
  resetOriginalSavedObjectBody = () => {
    this.originalSavedObjectBody = this.getAsSavedObjectBody();
  };

  isPersisted() {
    return typeof this.version === 'string';
  }

  /**
   * Get the source filtering configuration for that index.
   */
  getSourceFiltering() {
    return {
      excludes: (this.sourceFilters && this.sourceFilters.map((filter) => filter.value)) || [],
    };
  }

  /**
   * Get aggregation restrictions. Rollup fields can only perform a subset of aggregations.
   */

  getAggregationRestrictions() {
    return this.typeMeta?.aggs;
  }

  /**
   * Provide a field, get its formatter
   * @param field field to get formatter for
   */
  getFormatterForField(field: DataViewField | DataViewField['spec']): FieldFormat {
    const fieldFormat = this.getFormatterForFieldNoDefault(field.name);
    if (fieldFormat) {
      return fieldFormat;
    }

    return this.fieldFormats.getDefaultInstance(
      field.type as KBN_FIELD_TYPES,
      field.esTypes as ES_FIELD_TYPES[]
    );
  }

  /**
   * Get formatter for a given field name. Return undefined if none exists.
   * @param fieldname name of field to get formatter for
   */
  getFormatterForFieldNoDefault(fieldname: string) {
    const formatSpec = this.fieldFormatMap[fieldname];
    if (formatSpec?.id) {
      return this.fieldFormats.getInstance(formatSpec.id, formatSpec.params);
    }
  }

  /**
   * Set field attribute
   * @param fieldName name of field to set attribute on
   * @param attrName name of attribute to set
   * @param value value of attribute
   */

  protected setFieldAttrs<K extends keyof FieldAttrSet>(
    fieldName: string,
    attrName: K,
    value: FieldAttrSet[K]
  ) {
    if (!this.fieldAttrs[fieldName]) {
      this.fieldAttrs[fieldName] = {} as FieldAttrSet;
    }
    this.fieldAttrs[fieldName][attrName] = value;
  }

  /**
   * Set field formatter
   * @param fieldName name of field to set format on
   * @param format field format in serialized form
   */
  public readonly setFieldFormat = (fieldName: string, format: SerializedFieldFormat) => {
    this.fieldFormatMap[fieldName] = format;
  };

  /**
   * Remove field format from the field format map.
   * @param fieldName field name associated with the format for removal
   */

  public readonly deleteFieldFormat = (fieldName: string) => {
    delete this.fieldFormatMap[fieldName];
  };

  /**
   * Returns index pattern as saved object body for saving
   */
  getAsSavedObjectBody(): DataViewAttributes {
    // todo need new way to store these
    // const fieldAttrs = this.getFieldAttrs();
    const runtimeFieldMap = this.runtimeFieldMap;

    return {
      fieldAttrs: this.fieldAttrs ? JSON.stringify(this.fieldAttrs) : undefined,
      title: this.getIndexPattern(),
      timeFieldName: this.timeFieldName,
      sourceFilters: this.sourceFilters ? JSON.stringify(this.sourceFilters) : undefined,
      // todo need new way to get scripted fields
      fields:
        this.scriptedFields && this.scriptedFields.length
          ? JSON.stringify(this.scriptedFields)
          : undefined,
      fieldFormatMap: this.fieldFormatMap ? JSON.stringify(this.fieldFormatMap) : undefined,
      type: this.type!,
      typeMeta: JSON.stringify(this.typeMeta ?? {}),
      allowNoIndex: this.allowNoIndex ? this.allowNoIndex : undefined,
      runtimeFieldMap: runtimeFieldMap ? JSON.stringify(runtimeFieldMap) : undefined,
      name: this.name,
    };
  }
}
