/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { FieldFormatsStartCommon } from '@kbn/field-formats-plugin/common';
import { castEsToKbnFieldTypeName } from '@kbn/field-types';
import { each, pickBy, mapValues, pick, assign, chain } from 'lodash';
import { CharacterNotAllowedInField } from '@kbn/kibana-utils-plugin/common';
import { AbstractDataView } from './abstract_data_views';
import { DataViewField } from '../fields';
import { fieldMatchesFieldsRequested, fieldsMatchFieldsRequested } from './data_view_lazy_util';

import type {
  DataViewFieldMap as DataViewFieldSpecMap,
  DataViewSpec,
  FieldConfiguration,
  RuntimeField,
  RuntimeFieldSpec,
  RuntimeType,
  FieldSpec,
  IDataViewsApiClient,
} from '../types';
import { removeFieldAttrs } from './utils';

interface DataViewDeps {
  spec?: DataViewSpec;
  fieldFormats: FieldFormatsStartCommon;
  shortDotsEnable?: boolean;
  metaFields?: string[];
  apiClient: IDataViewsApiClient;
  scriptedFieldsEnabled: boolean;
}

interface GetFieldsParams {
  indexFilter?: QueryDslQueryContainer;
  unmapped?: boolean;
  fieldName: string[]; // supports wildcard
  mapped?: boolean;
  scripted?: boolean;
  runtime?: boolean;
  forceRefresh?: boolean;
  metaFields?: boolean;
  fieldTypes?: string[];
}

type DataViewFieldMap = Record<string, DataViewField>;

export class DataViewLazy extends AbstractDataView {
  private apiClient: IDataViewsApiClient;
  private fieldCache = new Map<string, DataViewField>();

  /**
   * Returns true if scripted fields are enabled
   */
  protected scriptedFieldsEnabled: boolean = false;

  constructor(config: DataViewDeps) {
    super(config);
    this.apiClient = config.apiClient;
    this.scriptedFieldsEnabled = config.scriptedFieldsEnabled;
  }

  async getFields({
    mapped = true,
    scripted = true,
    runtime = true,
    fieldName,
    forceRefresh = false,
    unmapped,
    indexFilter,
    metaFields = true,
  }: GetFieldsParams) {
    let mappedResult: DataViewFieldMap = {};
    let scriptedResult: DataViewFieldMap = {};
    let runtimeResult: DataViewFieldMap = {};
    // need to know if runtime fields are also mapped
    if (mapped || runtime) {
      // if we just need runtime fields, we can ask for the set of runtime fields specifically
      const fieldsToRequest = mapped
        ? fieldName
        : fieldsMatchFieldsRequested(Object.keys(this.runtimeFieldMap), fieldName);
      mappedResult = await this.getMappedFields({
        fieldName: fieldsToRequest,
        forceRefresh,
        unmapped,
        indexFilter,
        metaFields,
      });
    }

    if (scripted && this.scriptedFieldsEnabled) {
      scriptedResult = this.getScriptedFields({ fieldName });
    }

    if (runtime) {
      runtimeResult = this.getRuntimeFields({ fieldName });
    }

    const fieldMap = { ...mappedResult, ...scriptedResult, ...runtimeResult };
    let fieldMapSorted = {};
    let hasBeenSorted = false;

    return {
      getFieldMap: () => fieldMap,
      getFieldMapSorted: (): Record<string, DataViewField> => {
        if (!hasBeenSorted) {
          fieldMapSorted = chain(fieldMap).toPairs().sortBy(0).fromPairs().value();
          hasBeenSorted = true;
        }
        return fieldMapSorted;
      },
    };
  }

  public getRuntimeFields = ({ fieldName = ['*'] }: Pick<GetFieldsParams, 'fieldName'>) =>
    // getRuntimeFieldSpecMap flattens composites into a list of fields
    Object.values(this.getRuntimeFieldSpecMap({ fieldName: ['*'] })).reduce<DataViewFieldMap>(
      (col, field) => {
        if (!fieldMatchesFieldsRequested(field.name, fieldName)) {
          return col;
        }
        let cachedField = this.fieldCache.get(field.name);
        // if mapped field, can't be runtime field
        if (cachedField?.isMapped) {
          return col;
        }
        if (!cachedField) {
          cachedField = new DataViewField({
            ...field,
            count: this.fieldAttrs?.[field.name]?.count,
            customLabel: this.fieldAttrs?.[field.name]?.customLabel,
            customDescription: this.fieldAttrs?.[field.name]?.customDescription,
            shortDotsEnable: this.shortDotsEnable,
          });
          this.fieldCache.set(field.name, cachedField);
        }
        col[field.name] = cachedField;
        return col;
      },
      {}
    );

  /**
   * Add a runtime field - Appended to existing mapped field or a new field is
   * created as appropriate.
   * @param name Field name
   * @param runtimeField Runtime field definition
   */
  async addRuntimeField(name: string, runtimeField: RuntimeField): Promise<DataViewField[]> {
    if (name.includes('*')) {
      throw new CharacterNotAllowedInField('*', name);
    }

    const { type, script, customLabel, customDescription, format, popularity } = runtimeField;

    if (type === 'composite') {
      return this.addCompositeRuntimeField(name, runtimeField);
    }

    this.addRuntimeFieldInteral(name, runtimeField);
    const field = await this.updateOrAddRuntimeField(
      name,
      type,
      { type, script },
      {
        customLabel,
        customDescription,
        format,
        popularity,
      }
    );

    return [field];
  }

  private async addCompositeRuntimeField(
    name: string,
    runtimeField: RuntimeField
  ): Promise<DataViewField[]> {
    const { fields } = runtimeField;

    // Make sure subFields are provided
    if (fields === undefined || Object.keys(fields).length === 0) {
      throw new Error(`Can't add composite runtime field [name = ${name}] without subfields.`);
    }

    // Make sure no field with the same name already exist
    if ((await this.getFieldByName(name)) !== undefined) {
      throw new Error(
        `Can't create composite runtime field ["${name}"] as there is already a field with this name`
      );
    }

    // We first remove the runtime composite field with the same name which will remove all of its subFields.
    // This guarantees that we don't leave behind orphan data view fields
    this.removeRuntimeField(name);

    const runtimeFieldSpec = removeFieldAttrs(runtimeField);

    // We don't add composite runtime fields to the field list as
    // they are not fields but **holder** of fields.
    // What we do add to the field list are all their subFields.
    const dataViewFields = await Promise.all(
      Object.entries(fields).map(
        async ([subFieldName, subField]) =>
          // Every child field gets the complete runtime field script for consumption by searchSource
          await this.updateOrAddRuntimeField(
            `${name}.${subFieldName}`,
            subField.type,
            runtimeFieldSpec,
            {
              customLabel: subField.customLabel,
              customDescription: subField.customDescription,
              format: subField.format,
              popularity: subField.popularity,
            }
          )
      )
    );

    this.addRuntimeFieldInteral(name, runtimeField);
    return dataViewFields;
  }

  /**
   * Remove a runtime field - removed from mapped field or removed unmapped
   * field as appropriate. Doesn't clear associated field attributes.
   * @param name - Field name to remove
   */
  removeRuntimeField(name: string) {
    const existingField = this.fieldCache.get(name);

    if (existingField && existingField.isMapped) {
      // mapped field, remove runtimeField definition
      existingField.runtimeField = undefined;
    } else {
      Object.values(this.getFieldsByRuntimeFieldName(name) || {}).forEach((field) => {
        this.fieldCache.delete(field.name);
      });
    }

    this.removeRuntimeFieldInteral(name);
  }

  private getFieldsByRuntimeFieldName(name: string): Record<string, DataViewField> | undefined {
    const runtimeField = this.getRuntimeField(name);
    if (!runtimeField) {
      return;
    }

    if (runtimeField.type === 'composite') {
      return Object.entries(runtimeField.fields!).reduce<Record<string, DataViewField>>(
        (acc, [subFieldName, subField]) => {
          const fieldFullName = `${name}.${subFieldName}`;
          const dataViewField = this.fieldCache.get(fieldFullName);

          if (!dataViewField) {
            // We should never enter here as all composite runtime subfield
            // are converted to data view fields.
            return acc;
          }
          acc[subFieldName] = dataViewField;
          return acc;
        },
        {}
      );
    }

    const primitveRuntimeField = this.fieldCache.get(name);

    return primitveRuntimeField && { [name]: primitveRuntimeField };
  }

  // creates / updates non composite runtime fields. only called from addRuntimeField or addCompositeRuntimeField
  private async updateOrAddRuntimeField(
    fieldName: string,
    fieldType: RuntimeType,
    runtimeFieldSpec: RuntimeFieldSpec,
    config: FieldConfiguration
  ): Promise<DataViewField> {
    if (fieldType === 'composite') {
      throw new Error(
        `Trying to add composite field as primitive field, this shouldn't happen! [name = ${fieldName}]`
      );
    }

    // Create the field if it does not exist or update an existing one
    let fld = await this.getFieldByName(fieldName);

    if (fld) {
      fld.runtimeField = runtimeFieldSpec;
      fld.spec.type = castEsToKbnFieldTypeName(fieldType);
      fld.spec.esTypes = [fieldType];
    } else {
      fld = new DataViewField({
        name: fieldName,
        runtimeField: runtimeFieldSpec,
        type: castEsToKbnFieldTypeName(fieldType),
        esTypes: [fieldType],
        aggregatable: true,
        searchable: true,
        count: config.popularity ?? 0,
        readFromDocValues: false,
        shortDotsEnable: this.shortDotsEnable,
      });
      this.fieldCache.set(fieldName, fld);
    }

    this.setFieldCustomLabel(fieldName, config.customLabel);
    this.setFieldCustomDescription(fieldName, config.customDescription);

    if (config.popularity || config.popularity === null) {
      this.setFieldCount(fieldName, config.popularity);
    }

    if (config.format) {
      this.setFieldFormat(fieldName, config.format);
    } else if (config.format === null) {
      this.deleteFieldFormat(fieldName);
    }

    return fld;
  }

  private getRuntimeFieldSpecMap = ({ fieldName = ['*'] }: Pick<GetFieldsParams, 'fieldName'>) => {
    const spec: DataViewFieldSpecMap = {};

    const addRuntimeFieldToSpecFields = (
      name: string,
      fieldType: RuntimeType,
      runtimeField: RuntimeFieldSpec,
      parentName?: string
    ) => {
      spec[name] = {
        name,
        type: castEsToKbnFieldTypeName(fieldType),
        esTypes: [fieldType],
        runtimeField,
        aggregatable: true,
        searchable: true,
        readFromDocValues: false,
        customLabel: this.fieldAttrs?.[name]?.customLabel,
        customDescription: this.fieldAttrs?.[name]?.customDescription,
        count: this.fieldAttrs?.[name]?.count,
      };

      if (parentName) {
        spec[name].parentName = parentName;
      }
    };

    // CREATE RUNTIME FIELDS
    for (const [name, runtimeField] of Object.entries(this.runtimeFieldMap || {})) {
      if (fieldMatchesFieldsRequested(name, fieldName)) {
        // For composite runtime field we add the subFields, **not** the composite
        if (runtimeField.type === 'composite') {
          Object.entries(runtimeField.fields!).forEach(([subFieldName, subField]) => {
            addRuntimeFieldToSpecFields(
              `${name}.${subFieldName}`,
              subField.type,
              runtimeField,
              name
            );
          });
        } else {
          addRuntimeFieldToSpecFields(name, runtimeField.type, runtimeField);
        }
      }
    }

    return spec;
  };

  public getScriptedFields({ fieldName = ['*'] }: Pick<GetFieldsParams, 'fieldName'>) {
    const dataViewFields: Record<string, DataViewField> = {};

    Object.values(this.scriptedFieldsMap).forEach((field) => {
      if (!fieldMatchesFieldsRequested(field.name, fieldName)) {
        return;
      }
      let fld = this.fieldCache.get(field.name);

      // scripted field overrides mapped field
      if (fld && !fld.scripted && fld.isMapped) {
        this.fieldCache.delete(field.name);
      }
      fld = new DataViewField({
        ...field,
        scripted: true,
        searchable: true,
        aggregatable: true,
        count: this.fieldAttrs?.[field.name]?.count,
        customLabel: this.fieldAttrs?.[field.name]?.customLabel,
        customDescription: this.fieldAttrs?.[field.name]?.customDescription,
      });
      this.fieldCache.set(field.name, fld);
      dataViewFields[field.name] = fld;
    });
    return dataViewFields;
  }

  private async getMappedFields({
    fieldName,
    forceRefresh = false,
    unmapped: includeUnmapped,
    indexFilter,
    metaFields,
    fieldTypes,
  }: Omit<GetFieldsParams, 'mapped' | 'scripted' | 'runtime'>) {
    const response = await this.apiClient.getFieldsForWildcard({
      pattern: this.getIndexPattern(),
      metaFields: metaFields ? this.metaFields : undefined,
      type: this.type,
      rollupIndex: this.typeMeta?.params?.rollup_index,
      fields: fieldName || ['*'],
      allowNoIndex: true,
      indexFilter,
      includeUnmapped,
      forceRefresh,
      fieldTypes,
    });

    const dataViewFields: Record<string, DataViewField> = {};
    response.fields.forEach((field) => {
      // keep existing field object, make sure content is fresh
      let fld = this.fieldCache.get(field.name);
      if (fld) {
        // get fresh attributes
        assign(fld.spec, field);
        fld.spec.runtimeField = undefined; // unset if it was a runtime field but now mapped
        fld.spec.isMapped = true;
      } else {
        fld = new DataViewField({
          ...field,
          count: this.fieldAttrs?.[field.name]?.count,
          customLabel: this.fieldAttrs?.[field.name]?.customLabel,
          customDescription: this.fieldAttrs?.[field.name]?.customDescription,
          shortDotsEnable: this.shortDotsEnable,
        });
        this.fieldCache.set(field.name, fld);
      }
      dataViewFields[field.name] = fld;
    });

    return dataViewFields;
  }

  getScriptedFieldsForQuery() {
    return Object.values(this.scriptedFieldsMap).reduce<Record<string, estypes.ScriptField>>(
      (scriptFields, field) => {
        scriptFields[field.name] = {
          script: {
            source: field.script as string,
            lang: field.lang,
          },
        };
        return scriptFields;
      },
      {}
    );
  }

  async getComputedFields({ fieldName = ['*'] }: { fieldName: string[] }) {
    const scriptFields: Record<string, estypes.ScriptField> = {};

    const fieldMap = (
      await this.getFields({
        fieldName,
        fieldTypes: ['date', 'date_nanos'],
        scripted: false,
        runtime: false,
      })
    ).getFieldMap();

    const docvalueFields = Object.values(fieldMap).map((dateField) => {
      return {
        field: dateField.name,
        format:
          dateField.esTypes && dateField.esTypes.indexOf('date_nanos') !== -1
            ? 'strict_date_time'
            : 'date_time',
      };
    });

    each(this.getScriptedFields({ fieldName }), function (field) {
      scriptFields[field.name] = {
        script: {
          source: field.script!,
          lang: field.lang,
        },
      };
    });

    return {
      scriptFields,
      docvalueFields,
      runtimeFields: this.getRuntimeMappings(),
    };
  }

  getRuntimeMappings(): estypes.MappingRuntimeFields {
    return this.runtimeFieldMap;
  }

  /**
   * Creates static representation of the data view.
   * @param includeFields Whether or not to include the `fields` list as part of this spec. If not included, the list
   * will be fetched from Elasticsearch when instantiating a new Data View with this spec.
   */
  public async toSpec(params?: { fieldParams?: GetFieldsParams }): Promise<DataViewSpec> {
    const spec = this.toSpecShared(!!params?.fieldParams);

    if (params?.fieldParams) {
      const fields: DataViewFieldSpecMap = {};
      const fieldMap = (await this.getFields(params.fieldParams)).getFieldMap();
      Object.values(fieldMap).forEach((field) => {
        fields[field.name] = field.toSpec({
          getFormatterForField: this.getFormatterForField.bind(this),
        });
      });
      spec.fields = fields;
    }

    return spec;
  }

  /**
   * Creates a minimal static representation of the data view. Fields and popularity scores will be omitted.
   */
  // todo make shared
  public toMinimalSpec(params?: {
    keepFieldAttrs?: Array<'customLabel' | 'customDescription'>;
  }): Omit<DataViewSpec, 'fields'> {
    const fieldAttrsToKeep = params?.keepFieldAttrs ?? ['customLabel', 'customDescription'];
    // removes `fields`
    const spec = this.toSpecShared(false);

    if (spec.fieldAttrs) {
      // removes `count` props (popularity scores) from `fieldAttrs`
      spec.fieldAttrs = pickBy(
        // removes unnecessary attributes
        mapValues(spec.fieldAttrs, (fieldAttrs) => pick(fieldAttrs, fieldAttrsToKeep)),
        // removes empty objects if all attributes have been removed
        (trimmedFieldAttrs) => Object.keys(trimmedFieldAttrs).length > 0
      );

      // removes `fieldAttrs` if it's empty
      if (Object.keys(spec.fieldAttrs).length === 0) {
        delete spec.fieldAttrs;
      }
    }

    return Object.fromEntries(Object.entries(spec).filter(([, v]) => typeof v !== 'undefined'));
  }

  /**
   * returns true if dataview contains TSDB fields
   */
  async isTSDBMode() {
    const fieldMap = (await this.getFields({ fieldName: ['*'] })).getFieldMap();

    return Object.values(fieldMap).some(
      (field) => field.timeSeriesDimension || field.timeSeriesMetric
    );
  }

  removeScriptedField(fieldName: string) {
    this.deleteScriptedFieldInternal(fieldName);
    this.fieldCache.delete(fieldName);
  }

  upsertScriptedField(field: FieldSpec) {
    return this.upsertScriptedFieldInternal(field);
  }

  isTimeBased = async () => !!(await this.getTimeField());

  async isTimeNanosBased(): Promise<boolean> {
    const field = await this.getTimeField();
    return field ? field.type === 'date_nanos' : false;
  }

  getTimeField = () => (this.timeFieldName ? this.getFieldByName(this.timeFieldName) : undefined);

  async getFieldByName(name: string, forceRefresh = false) {
    const fieldMap = (await this.getFields({ fieldName: [name], forceRefresh })).getFieldMap();
    return fieldMap[name];
  }

  /**
   * Set field custom label
   * @param fieldName name of field to set custom label on
   * @param customLabel custom label value. If undefined, custom label is removed
   */

  public setFieldCustomLabel(fieldName: string, customLabel: string | undefined | null) {
    const newCustomLabel: string | undefined = customLabel === null ? undefined : customLabel;
    this.setFieldCustomLabelInternal(fieldName, customLabel);
    const fieldObject = this.fieldCache.get(fieldName);
    if (fieldObject) {
      fieldObject.spec.customLabel = newCustomLabel;
    }
  }

  public setFieldCount(fieldName: string, count: number | undefined | null) {
    const newCount: number | undefined = count === null ? undefined : count;
    this.setFieldCountInternal(fieldName, count);
    const fieldObject = this.fieldCache.get(fieldName);
    if (fieldObject) {
      if (!newCount) fieldObject.deleteCount();
      else fieldObject.spec.count = newCount;
    }
  }

  public setFieldCustomDescription(
    fieldName: string,
    customDescription: string | undefined | null
  ) {
    const newCustomDescription: string | undefined =
      customDescription === null ? undefined : customDescription;
    this.setFieldCustomDescriptionInternal(fieldName, customDescription);
    const fieldObject = this.fieldCache.get(fieldName);
    if (fieldObject) {
      fieldObject.spec.customDescription = newCustomDescription;
    }
  }
}
