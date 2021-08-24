/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import _, { each, reject } from 'lodash';
import { castEsToKbnFieldTypeName } from '@kbn/field-types';

import { FieldAttrs, FieldAttrSet, IndexPatternAttributes } from '../..';
import type {
  EnhancedRuntimeField,
  RuntimeField,
  RuntimeType,
  RuntimeComposite,
  RuntimeCompositeWithSubFields,
} from '../types';
import { DuplicateField } from '../../../../kibana_utils/common';

import { ES_FIELD_TYPES, KBN_FIELD_TYPES, IIndexPattern, IFieldType } from '../../../common';
import { IndexPatternField, IIndexPatternFieldList, fieldList } from '../fields';
import { formatHitProvider } from './format_hit';
import { flattenHitWrapper } from './flatten_hit';
import { FieldFormatsStartCommon, FieldFormat } from '../../../../field_formats/common';
import { IndexPatternSpec, TypeMeta, SourceFilter, IndexPatternFieldMap } from '../types';
import { SerializedFieldFormat } from '../../../../expressions/common';

interface IndexPatternDeps {
  spec?: IndexPatternSpec;
  fieldFormats: FieldFormatsStartCommon;
  shortDotsEnable?: boolean;
  metaFields?: string[];
}

interface SavedObjectBody {
  fieldAttrs?: string;
  title?: string;
  timeFieldName?: string;
  intervalName?: string;
  fields?: string;
  sourceFilters?: string;
  fieldFormatMap?: string;
  typeMeta?: string;
  type?: string;
}

type FormatFieldFn = (hit: Record<string, any>, fieldName: string) => any;

export class IndexPattern implements IIndexPattern {
  public id?: string;
  public title: string = '';
  public fieldFormatMap: Record<string, any>;
  /**
   * Only used by rollup indices, used by rollup specific endpoint to load field list
   */
  public typeMeta?: TypeMeta;
  public fields: IIndexPatternFieldList & { toSpec: () => IndexPatternFieldMap };
  public timeFieldName: string | undefined;
  /**
   * @deprecated Used by time range index patterns
   * @removeBy 8.1
   *
   */
  public intervalName: string | undefined;
  /**
   * Type is used to identify rollup index patterns
   */
  public type: string | undefined;
  public formatHit: {
    (hit: Record<string, any>, type?: string): any;
    formatField: FormatFieldFn;
  };
  public formatField: FormatFieldFn;
  public flattenHit: (hit: Record<string, any>, deep?: boolean) => Record<string, any>;
  public metaFields: string[];
  /**
   * SavedObject version
   */
  public version: string | undefined;
  public sourceFilters?: SourceFilter[];
  private originalSavedObjectBody: SavedObjectBody = {};
  private shortDotsEnable: boolean = false;
  private fieldFormats: FieldFormatsStartCommon;
  private fieldAttrs: FieldAttrs;
  private runtimeFieldMap: Record<string, RuntimeField>;
  private runtimeCompositeMap: Record<string, RuntimeComposite>;

  /**
   * prevents errors when index pattern exists before indices
   */
  public readonly allowNoIndex: boolean = false;

  constructor({
    spec = {},
    fieldFormats,
    shortDotsEnable = false,
    metaFields = [],
  }: IndexPatternDeps) {
    // set dependencies
    this.fieldFormats = fieldFormats;
    // set config
    this.shortDotsEnable = shortDotsEnable;
    this.metaFields = metaFields;
    // initialize functionality
    this.fields = fieldList([], this.shortDotsEnable);

    this.flattenHit = flattenHitWrapper(this, metaFields);
    this.formatHit = formatHitProvider(
      this,
      fieldFormats.getDefaultInstance(KBN_FIELD_TYPES.STRING)
    );
    this.formatField = this.formatHit.formatField;

    // set values
    this.id = spec.id;
    this.fieldFormatMap = spec.fieldFormats || {};

    this.version = spec.version;

    this.title = spec.title || '';
    this.timeFieldName = spec.timeFieldName;
    this.sourceFilters = spec.sourceFilters;
    this.fields.replaceAll(Object.values(spec.fields || {}));
    this.type = spec.type;
    this.typeMeta = spec.typeMeta;
    this.fieldAttrs = spec.fieldAttrs || {};
    this.intervalName = spec.intervalName;
    this.allowNoIndex = spec.allowNoIndex || false;
    this.runtimeFieldMap = spec.runtimeFieldMap || {};
    this.runtimeCompositeMap = spec.runtimeCompositeMap || {};
  }

  /**
   * Get last saved saved object fields
   */
  getOriginalSavedObjectBody = () => ({ ...this.originalSavedObjectBody });

  /**
   * Reset last saved saved object fields. used after saving
   */
  resetOriginalSavedObjectBody = () => {
    this.originalSavedObjectBody = this.getAsSavedObjectBody();
  };

  getFieldAttrs = () => {
    const newFieldAttrs = { ...this.fieldAttrs };

    this.fields.forEach((field) => {
      const attrs: FieldAttrSet = {};
      let hasAttr = false;
      if (field.customLabel) {
        attrs.customLabel = field.customLabel;
        hasAttr = true;
      }
      if (field.count) {
        attrs.count = field.count;
        hasAttr = true;
      }

      if (hasAttr) {
        newFieldAttrs[field.name] = attrs;
      } else {
        delete newFieldAttrs[field.name];
      }
    });

    return newFieldAttrs;
  };

  getComputedFields() {
    const scriptFields: any = {};
    if (!this.fields) {
      return {
        storedFields: ['*'],
        scriptFields,
        docvalueFields: [] as Array<{ field: string; format: string }>,
        runtimeFields: {},
      };
    }

    // Date value returned in "_source" could be in any number of formats
    // Use a docvalue for each date field to ensure standardized formats when working with date fields
    // indexPattern.flattenHit will override "_source" values when the same field is also defined in "fields"
    const docvalueFields = reject(this.fields.getByType('date'), 'scripted').map(
      (dateField: any) => {
        return {
          field: dateField.name,
          format:
            dateField.esTypes && dateField.esTypes.indexOf('date_nanos') !== -1
              ? 'strict_date_time'
              : 'date_time',
        };
      }
    );

    each(this.getScriptedFields(), function (field) {
      scriptFields[field.name] = {
        script: {
          source: field.script,
          lang: field.lang,
        },
      };
    });

    const runtimeFields = {
      ...this.getComputedRuntimeFields(),
      ...this.getComputedRuntimeComposites(),
    };

    return {
      storedFields: ['*'],
      scriptFields,
      docvalueFields,
      runtimeFields,
    };
  }

  /**
   * Method to aggregate all the runtime fields which are **not** created
   * from a parent composite runtime field.
   * @returns A map of runtime fields
   */
  private getComputedRuntimeFields(): Record<string, RuntimeField> {
    return Object.entries(this.runtimeFieldMap).reduce((acc, [name, field]) => {
      const { type, script, parent } = field;

      if (parent !== undefined) {
        return acc;
      }

      const runtimeFieldRequest: RuntimeField = {
        type,
        script,
      };

      return {
        ...acc,
        [name]: runtimeFieldRequest,
      };
    }, {});
  }

  /**
   * This method reads all the runtime composite fields
   * and aggregate the subFields
   *
   * {
   *   "compositeName": {
   *     "type": "composite",
   *     "script": "emit(...)" // script that emits multiple values
   *     "fields": {  // map of subFields available in the Query
   *       "field_1": {
   *         "type": "keyword"
   *       },
   *       "field_2": {
   *         "type": "ip"
   *       },
   *     }
   *   }
   * }
   *
   * @returns A map of runtime fields
   */
  private getComputedRuntimeComposites(): Record<string, RuntimeField> {
    return Object.entries(this.runtimeCompositeMap).reduce((acc, [name, runtimeComposite]) => {
      const { script, subFields } = runtimeComposite;

      // Aggregate all the subFields belonging to this runtimeComposite
      const fields: Record<string, { type: RuntimeType }> = subFields.reduce(
        (accFields, subFieldName) => {
          const subField = this.getRuntimeField(`${name}.${subFieldName}`);

          if (!subField) {
            return accFields;
          }

          return {
            ...accFields,
            [subFieldName]: { type: subField.type },
          };
        },
        {} as Record<string, { type: RuntimeType }>
      );

      if (Object.keys(fields).length === 0) {
        // This should never happen, but sending a composite runtime field
        // with an empty "fields" will break the Query
        return acc;
      }

      const runtimeFieldRequest: RuntimeField = {
        type: 'composite',
        script,
        fields,
      };

      return {
        ...acc,
        [name]: runtimeFieldRequest,
      };
    }, {});
  }

  /**
   * Create static representation of index pattern
   */
  public toSpec(): IndexPatternSpec {
    return {
      id: this.id,
      version: this.version,

      title: this.title,
      timeFieldName: this.timeFieldName,
      sourceFilters: this.sourceFilters,
      fields: this.fields.toSpec({ getFormatterForField: this.getFormatterForField.bind(this) }),
      typeMeta: this.typeMeta,
      type: this.type,
      fieldFormats: this.fieldFormatMap,
      runtimeFieldMap: this.runtimeFieldMap,
      runtimeCompositeMap: this.runtimeCompositeMap,
      fieldAttrs: this.fieldAttrs,
      intervalName: this.intervalName,
      allowNoIndex: this.allowNoIndex,
    };
  }

  /**
   * Get the source filtering configuration for that index.
   */
  getSourceFiltering() {
    return {
      excludes: (this.sourceFilters && this.sourceFilters.map((filter: any) => filter.value)) || [],
    };
  }

  /**
   * Add scripted field to field list
   *
   * @param name field name
   * @param script script code
   * @param fieldType
   * @param lang
   * @deprecated use runtime field instead
   * @removeBy 8.1
   */
  async addScriptedField(name: string, script: string, fieldType: string = 'string') {
    const scriptedFields = this.getScriptedFields();
    const names = _.map(scriptedFields, 'name');

    if (_.includes(names, name)) {
      throw new DuplicateField(name);
    }

    this.fields.add({
      name,
      script,
      type: fieldType,
      scripted: true,
      lang: 'painless',
      aggregatable: true,
      searchable: true,
      count: 0,
      readFromDocValues: false,
    });
  }

  /**
   * Remove scripted field from field list
   * @param fieldName
   * @deprecated use runtime field instead
   * @removeBy 8.1
   */

  removeScriptedField(fieldName: string) {
    const field = this.fields.getByName(fieldName);
    if (field) {
      this.fields.remove(field);
    }
  }

  /**
   *
   * @deprecated use runtime field instead
   * @removeBy 8.1
   */
  getNonScriptedFields() {
    return [...this.fields.getAll().filter((field) => !field.scripted)];
  }

  /**
   *
   * @deprecated use runtime field instead
   * @removeBy 8.1
   */
  getScriptedFields() {
    return [...this.fields.getAll().filter((field) => field.scripted)];
  }

  isTimeBased(): boolean {
    return !!this.timeFieldName && (!this.fields || !!this.getTimeField());
  }

  isTimeNanosBased(): boolean {
    const timeField: any = this.getTimeField();
    return timeField && timeField.esTypes && timeField.esTypes.indexOf('date_nanos') !== -1;
  }

  getTimeField() {
    if (!this.timeFieldName || !this.fields || !this.fields.getByName) return undefined;
    return this.fields.getByName(this.timeFieldName);
  }

  getFieldByName(name: string): IndexPatternField | undefined {
    if (!this.fields || !this.fields.getByName) return undefined;
    return this.fields.getByName(name);
  }

  getAggregationRestrictions() {
    return this.typeMeta?.aggs;
  }

  /**
   * Returns index pattern as saved object body for saving
   */
  getAsSavedObjectBody(): IndexPatternAttributes {
    const fieldFormatMap = _.isEmpty(this.fieldFormatMap)
      ? undefined
      : JSON.stringify(this.fieldFormatMap);
    const fieldAttrs = this.getFieldAttrs();
    const runtimeFieldMap = this.runtimeFieldMap;
    const runtimeCompositeMap = this.runtimeCompositeMap;

    return {
      fieldAttrs: fieldAttrs ? JSON.stringify(fieldAttrs) : undefined,
      title: this.title,
      timeFieldName: this.timeFieldName,
      intervalName: this.intervalName,
      sourceFilters: this.sourceFilters ? JSON.stringify(this.sourceFilters) : undefined,
      fields: JSON.stringify(this.fields?.filter((field) => field.scripted) ?? []),
      fieldFormatMap,
      type: this.type!,
      typeMeta: JSON.stringify(this.typeMeta ?? {}),
      allowNoIndex: this.allowNoIndex ? this.allowNoIndex : undefined,
      runtimeFieldMap: runtimeFieldMap ? JSON.stringify(runtimeFieldMap) : undefined,
      runtimeCompositeMap: runtimeCompositeMap ? JSON.stringify(runtimeCompositeMap) : undefined,
    };
  }

  /**
   * Provide a field, get its formatter
   * @param field
   */
  getFormatterForField(
    field: IndexPatternField | IndexPatternField['spec'] | IFieldType
  ): FieldFormat {
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
   * Add a runtime field - Appended to existing mapped field or a new field is
   * created as appropriate
   * @param name Field name
   * @param runtimeField Runtime field definition
   */
  addRuntimeField(name: string, enhancedRuntimeField: EnhancedRuntimeField): IndexPatternField {
    const { type, script, parent, customLabel, format, popularity } = enhancedRuntimeField;

    const runtimeField: RuntimeField = { type, script, parent };

    let fieldCreated: IndexPatternField;
    const existingField = this.getFieldByName(name);
    if (existingField) {
      existingField.runtimeField = runtimeField;
      fieldCreated = existingField;
    } else {
      fieldCreated = this.fields.add({
        name,
        runtimeField,
        type: castEsToKbnFieldTypeName(type),
        aggregatable: true,
        searchable: true,
        count: popularity ?? 0,
        readFromDocValues: false,
      });
    }
    this.runtimeFieldMap[name] = runtimeField;

    this.setFieldCustomLabel(name, customLabel);

    if (format) {
      this.setFieldFormat(name, format);
    } else {
      this.deleteFieldFormat(name);
    }

    return fieldCreated;
  }

  /**
   * Checks if runtime field exists
   * @param name
   */
  hasRuntimeField(name: string): boolean {
    return !!this.runtimeFieldMap[name];
  }

  /**
   * Returns runtime field if exists
   * @param name
   */
  getRuntimeField(name: string): RuntimeField | null {
    return this.runtimeFieldMap[name] ?? null;
  }

  /**
   * Replaces all existing runtime fields with new fields
   * @param newFields
   */
  replaceAllRuntimeFields(newFields: Record<string, RuntimeField>) {
    const oldRuntimeFieldNames = Object.keys(this.runtimeFieldMap);
    oldRuntimeFieldNames.forEach((name) => {
      this.removeRuntimeField(name);
    });

    Object.entries(newFields).forEach(([name, field]) => {
      this.addRuntimeField(name, field);
    });
  }

  /**
   * Remove a runtime field - removed from mapped field or removed unmapped
   * field as appropriate. Doesn't clear associated field attributes.
   * @param name - Field name to remove
   */
  removeRuntimeField(name: string) {
    const existingField = this.getFieldByName(name);
    if (existingField) {
      if (existingField.isMapped) {
        // mapped field, remove runtimeField def
        existingField.runtimeField = undefined;
      } else {
        this.fields.remove(existingField);
      }
    }
    delete this.runtimeFieldMap[name];
  }

  /**
   * Create a runtime composite and add its subFields to the index pattern fields list
   * @param name - The runtime composite name
   * @param runtimeComposite - The runtime composite definition
   */
  addRuntimeComposite(
    name: string,
    runtimeComposite: RuntimeCompositeWithSubFields
  ): IndexPatternField[] {
    if (!runtimeComposite.subFields || Object.keys(runtimeComposite.subFields).length === 0) {
      throw new Error(`Can't save runtime composite [name = ${name}] without subfields.`);
    }

    this.removeRuntimeComposite(name);

    const { script, subFields } = runtimeComposite;

    const fieldsCreated: IndexPatternField[] = [];

    for (const [subFieldName, subField] of Object.entries(subFields)) {
      const field = this.addRuntimeField(`${name}.${subFieldName}`, { ...subField, parent: name });
      fieldsCreated.push(field);
    }

    this.runtimeCompositeMap[name] = {
      name,
      script,
      // We only need to keep a reference of the subFields names
      subFields: Object.keys(subFields),
    };

    return fieldsCreated;
  }

  /**
   * Returns runtime composite if exists
   * @param name
   */
  getRuntimeComposite(name: string): RuntimeComposite | null {
    return this.runtimeCompositeMap[name] ?? null;
  }

  /**
   * Returns runtime composite (if exists) with its subFields
   * @param name
   */
  getRuntimeCompositeWithSubFields(name: string): RuntimeCompositeWithSubFields | null {
    const existingRuntimeComposite = this.runtimeCompositeMap[name];

    if (!existingRuntimeComposite) {
      return null;
    }

    const subFields = existingRuntimeComposite.subFields.reduce((acc, subFieldName) => {
      const field = this.getFieldByName(subFieldName);

      if (!field) {
        // This condition should never happen
        return acc;
      }

      const runtimeField: EnhancedRuntimeField = {
        type: field.type as RuntimeType,
        customLabel: field.customLabel,
        popularity: field.count,
        parent: name,
        format: this.getFormatterForFieldNoDefault(field.name)?.toJSON(),
      };

      return {
        ...acc,
        [subFieldName]: runtimeField,
      };
    }, {} as Record<string, EnhancedRuntimeField>);

    return {
      ...existingRuntimeComposite,
      subFields,
    };
  }

  /**
   * Remove a runtime composite with its associated subFields
   * @param name - Runtime composite name to remove
   */
  removeRuntimeComposite(name: string) {
    const existingRuntimeComposite = this.getRuntimeComposite(name);

    if (!!existingRuntimeComposite) {
      // Remove all previous subFields
      for (const subFieldName of existingRuntimeComposite.subFields) {
        this.removeRuntimeField(`${name}.${subFieldName}`);
      }

      delete this.runtimeCompositeMap[name];
    }
  }

  /**
   * Get formatter for a given field name. Return undefined if none exists
   * @param field
   */
  getFormatterForFieldNoDefault(fieldname: string) {
    const formatSpec = this.fieldFormatMap[fieldname];
    if (formatSpec?.id) {
      return this.fieldFormats.getInstance(formatSpec.id, formatSpec.params);
    }
  }

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

  public setFieldCustomLabel(fieldName: string, customLabel: string | undefined | null) {
    const fieldObject = this.fields.getByName(fieldName);
    const newCustomLabel: string | undefined = customLabel === null ? undefined : customLabel;

    if (fieldObject) {
      fieldObject.customLabel = newCustomLabel;
    }

    this.setFieldAttrs(fieldName, 'customLabel', newCustomLabel);
  }

  public setFieldCount(fieldName: string, count: number | undefined | null) {
    const fieldObject = this.fields.getByName(fieldName);
    const newCount: number | undefined = count === null ? undefined : count;

    if (fieldObject) {
      if (!newCount) fieldObject.deleteCount();
      else fieldObject.count = newCount;
      return;
    }

    this.setFieldAttrs(fieldName, 'count', newCount);
  }

  public readonly setFieldFormat = (fieldName: string, format: SerializedFieldFormat) => {
    this.fieldFormatMap[fieldName] = format;
  };

  public readonly deleteFieldFormat = (fieldName: string) => {
    delete this.fieldFormatMap[fieldName];
  };
}
