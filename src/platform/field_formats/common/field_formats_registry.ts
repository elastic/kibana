/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// eslint-disable-next-line max-classes-per-file
import { memoize, identity } from 'lodash';
import { ES_FIELD_TYPES, KBN_FIELD_TYPES } from '@kbn/field-types';

import {
  FieldFormatsGetConfigFn,
  FieldFormatConfig,
  FIELD_FORMAT_IDS,
  FieldFormatInstanceType,
  FieldFormatId,
  FieldFormatMetaParams,
  SerializedFieldFormat,
  FormatFactory,
  FieldFormatParams,
} from './types';
import { baseFormatters } from './constants/base_formatters';
import { FieldFormat } from './field_format';
import { FORMATS_UI_SETTINGS } from './constants/ui_settings';
import { FieldFormatNotFoundError } from './errors';

export class FieldFormatsRegistry {
  protected fieldFormats: Map<FieldFormatId, FieldFormatInstanceType> = new Map();
  protected defaultMap: Record<string, FieldFormatConfig> = {};
  protected metaParamsOptions: FieldFormatMetaParams = {};
  protected getConfig?: FieldFormatsGetConfigFn;

  public deserialize: FormatFactory = (mapping?: SerializedFieldFormat) => {
    if (!mapping) {
      return new (FieldFormat.from(identity))();
    }

    const { id, params = {} } = mapping;
    if (id) {
      const Format = this.getType(id);

      if (Format) {
        return new Format(params, this.getConfig);
      }
    }

    return new (FieldFormat.from(identity))();
  };

  init(
    getConfig: FieldFormatsGetConfigFn,
    metaParamsOptions: FieldFormatMetaParams = {},
    defaultFieldConverters: FieldFormatInstanceType[] = baseFormatters
  ) {
    const defaultTypeMap = getConfig(FORMATS_UI_SETTINGS.FORMAT_DEFAULT_TYPE_MAP) as Record<
      string,
      FieldFormatConfig
    >;
    this.register(defaultFieldConverters);
    this.parseDefaultTypeMap(defaultTypeMap);
    this.getConfig = getConfig;
    this.metaParamsOptions = metaParamsOptions;
  }

  /**
   * Get the id of the default type for this field type
   * using the format:defaultTypeMap config map
   *
   * @param  {KBN_FIELD_TYPES} fieldType - the field type
   * @param  {ES_FIELD_TYPES[]} esTypes - Array of ES data types
   * @return {FieldType}
   */
  getDefaultConfig = (
    fieldType: KBN_FIELD_TYPES,
    esTypes?: ES_FIELD_TYPES[]
  ): FieldFormatConfig => {
    const type = this.getDefaultTypeName(fieldType, esTypes);

    return (
      (this.defaultMap && this.defaultMap[type]) || { id: FIELD_FORMAT_IDS.STRING, params: {} }
    );
  };

  /**
   * Get a derived FieldFormat class by its id.
   *
   * @param  {FieldFormatId} formatId - the format id
   * @return {FieldFormatInstanceType | undefined}
   */
  getType = (formatId: FieldFormatId): FieldFormatInstanceType | undefined => {
    const fieldFormat = this.fieldFormats.get(formatId);

    if (fieldFormat) {
      const decoratedFieldFormat = this.fieldFormatMetaParamsDecorator(fieldFormat);

      if (decoratedFieldFormat) {
        return decoratedFieldFormat;
      }
    }

    return undefined;
  };

  getTypeWithoutMetaParams = (formatId: FieldFormatId): FieldFormatInstanceType | undefined => {
    return this.fieldFormats.get(formatId);
  };

  /**
   * Get the default FieldFormat type (class) for
   * a field type, using the format:defaultTypeMap.
   * used by the field editor
   *
   * @param  {KBN_FIELD_TYPES} fieldType
   * @param  {ES_FIELD_TYPES[]} esTypes - Array of ES data types
   * @return {FieldFormatInstanceType | undefined}
   */
  getDefaultType = (
    fieldType: KBN_FIELD_TYPES,
    esTypes?: ES_FIELD_TYPES[]
  ): FieldFormatInstanceType | undefined => {
    const config = this.getDefaultConfig(fieldType, esTypes);

    return this.getType(config.id);
  };

  /**
   * Get the name of the default type for ES types like date_nanos
   * using the format:defaultTypeMap config map
   *
   * @param  {ES_FIELD_TYPES[]} esTypes - Array of ES data types
   * @return {ES_FIELD_TYPES | undefined}
   */
  getTypeNameByEsTypes = (esTypes: ES_FIELD_TYPES[] | undefined): ES_FIELD_TYPES | undefined => {
    if (!Array.isArray(esTypes)) {
      return undefined;
    }

    return esTypes.find((type) => this.defaultMap[type] && this.defaultMap[type].es);
  };

  /**
   * Get the default FieldFormat type name for
   * a field type, using the format:defaultTypeMap.
   *
   * @param  {KBN_FIELD_TYPES} fieldType
   * @param  {ES_FIELD_TYPES[]} esTypes
   * @return {ES_FIELD_TYPES | KBN_FIELD_TYPES}
   */
  getDefaultTypeName = (
    fieldType: KBN_FIELD_TYPES,
    esTypes?: ES_FIELD_TYPES[]
  ): ES_FIELD_TYPES | KBN_FIELD_TYPES => {
    const esType = this.getTypeNameByEsTypes(esTypes);

    return esType || fieldType;
  };

  /**
   * Get the singleton instance of the FieldFormat type by its id.
   *
   * @param  {FieldFormatId} formatId
   * @return {FieldFormat}
   */
  getInstance = (formatId: FieldFormatId, params: FieldFormatParams = {}): FieldFormat => {
    return this.getInstanceMemoized(formatId, params);
  };

  private getInstanceMemoized = memoize(
    (formatId: FieldFormatId, params: FieldFormatParams = {}): FieldFormat => {
      const ConcreteFieldFormat = this.getType(formatId);

      if (!ConcreteFieldFormat) {
        throw new FieldFormatNotFoundError(`Field Format '${formatId}' not found!`, formatId);
      }

      return new ConcreteFieldFormat(params, this.getConfig);
    },
    (formatId: FieldFormatId, params?: FieldFormatParams) =>
      JSON.stringify({
        formatId,
        ...params,
      })
  );

  /**
   * Get the default fieldFormat instance for a field format.
   *
   * @param  {KBN_FIELD_TYPES} fieldType
   * @param  {ES_FIELD_TYPES[]} esTypes
   * @return {FieldFormat}
   */
  getDefaultInstancePlain = (
    fieldType: KBN_FIELD_TYPES,
    esTypes?: ES_FIELD_TYPES[],
    params: FieldFormatParams = {}
  ): FieldFormat => {
    const conf = this.getDefaultConfig(fieldType, esTypes);
    const instanceParams = {
      ...conf.params,
      ...params,
    };

    return this.getInstance(conf.id, instanceParams);
  };
  /**
   * Returns a cache key built by the given variables for caching in memoized
   * Where esType contains fieldType, fieldType is returned
   * -> kibana types have a higher priority in that case
   * -> would lead to failing tests that match e.g. date format with/without esTypes
   * https://lodash.com/docs#memoize
   *
   * @param  {KBN_FIELD_TYPES} fieldType
   * @param  {ES_FIELD_TYPES[] | undefined} esTypes
   * @return {String}
   */
  getDefaultInstanceCacheResolver(fieldType: KBN_FIELD_TYPES, esTypes?: ES_FIELD_TYPES[]): string {
    // @ts-ignore
    return Array.isArray(esTypes) && esTypes.indexOf(fieldType) === -1
      ? [fieldType, ...esTypes].join('-')
      : fieldType;
  }

  /**
   * Get filtered list of field formats by format type,
   * Skips hidden field formats
   *
   * @param  {KBN_FIELD_TYPES} fieldType
   * @return {FieldFormatInstanceType[]}
   */
  getByFieldType(fieldType: KBN_FIELD_TYPES): FieldFormatInstanceType[] {
    return [...this.fieldFormats.values()]
      .filter(
        (format: FieldFormatInstanceType) =>
          format && !format.hidden && format.fieldType.indexOf(fieldType) !== -1
      )
      .map(
        (format: FieldFormatInstanceType) =>
          this.fieldFormatMetaParamsDecorator(format) as FieldFormatInstanceType
      );
  }

  /**
   * Get the default fieldFormat instance for a field format.
   * It's a memoized function that builds and reads a cache
   *
   * @param  {KBN_FIELD_TYPES} fieldType
   * @param  {ES_FIELD_TYPES[]} esTypes
   * @param  {FieldFormatParams} params
   * @return {FieldFormat}
   */
  getDefaultInstance = (
    fieldType: KBN_FIELD_TYPES,
    esTypes?: ES_FIELD_TYPES[],
    params: FieldFormatParams = {}
  ): FieldFormat => {
    return this.getDefaultInstanceMemoized(fieldType, esTypes, params);
  };

  private getDefaultInstanceMemoized = memoize(
    this.getDefaultInstancePlain,
    this.getDefaultInstanceCacheResolver
  );

  parseDefaultTypeMap(value: Record<string, FieldFormatConfig>) {
    this.defaultMap = value;
    this.getInstanceMemoized.cache.clear?.();
    this.getDefaultInstanceMemoized.cache.clear?.();
  }

  register(fieldFormats: FieldFormatInstanceType[]) {
    fieldFormats.forEach((fieldFormat) => {
      if (this.fieldFormats.has(fieldFormat.id))
        throw new Error(
          `Failed to register field format with id "${fieldFormat.id}" as it already has been registered`
        );
      this.fieldFormats.set(fieldFormat.id, fieldFormat);
    });
  }

  /**
   * Checks if field format with id already registered
   * @param id
   */
  has(id: string): boolean {
    return this.fieldFormats.has(id);
  }

  /**
   * FieldFormat decorator - provide a one way to add meta-params for all field formatters
   *
   * @private
   * @param  {FieldFormatInstanceType} fieldFormat - field format type
   * @return {FieldFormatInstanceType | undefined}
   */
  private fieldFormatMetaParamsDecorator = (
    fieldFormat: FieldFormatInstanceType
  ): FieldFormatInstanceType | undefined => {
    const getMetaParams = (customParams: FieldFormatParams) => this.buildMetaParams(customParams);

    if (fieldFormat) {
      return class DecoratedFieldFormat extends fieldFormat {
        static id = fieldFormat.id;
        static fieldType = fieldFormat.fieldType;

        constructor(params: FieldFormatParams = {}, getConfig?: FieldFormatsGetConfigFn) {
          super(getMetaParams(params), getConfig);
        }
      };
    }

    return undefined;
  };

  /**
   * Build Meta Params
   *
   * @param  {FieldFormatParams} custom params
   * @return {FieldFormatParams & FieldFormatMetaParams}
   */
  private buildMetaParams = (
    customParams: FieldFormatParams
  ): FieldFormatParams & FieldFormatMetaParams => ({
    ...this.metaParamsOptions,
    ...customParams,
  });
}
