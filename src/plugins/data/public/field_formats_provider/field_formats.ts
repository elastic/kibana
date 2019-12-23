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

// eslint-disable-next-line max-classes-per-file
import { forOwn, isFunction, memoize } from 'lodash';
import { IUiSettingsClient, CoreSetup } from 'kibana/public';
import {
  ES_FIELD_TYPES,
  KBN_FIELD_TYPES,
  FIELD_FORMAT_IDS,
  IFieldFormatType,
  IFieldFormatId,
  FieldFormat,
} from '../../common';
import { FieldType } from './types';

export class FieldFormatRegisty {
  private fieldFormats: Map<IFieldFormatId, IFieldFormatType>;
  private uiSettings!: IUiSettingsClient;
  private defaultMap: Record<string, FieldType>;
  private basePath?: string;

  constructor() {
    this.fieldFormats = new Map();
    this.defaultMap = {};
  }

  getConfig = (key: string, override?: any) => this.uiSettings.get(key, override);

  init({ uiSettings, http }: CoreSetup) {
    this.uiSettings = uiSettings;
    this.basePath = http.basePath.get();

    this.parseDefaultTypeMap(this.uiSettings.get('format:defaultTypeMap'));

    this.uiSettings.getUpdate$().subscribe(({ key, newValue }) => {
      if (key === 'format:defaultTypeMap') {
        this.parseDefaultTypeMap(newValue);
      }
    });
  }

  /**
   * Get the id of the default type for this field type
   * using the format:defaultTypeMap config map
   *
   * @param  {KBN_FIELD_TYPES} fieldType - the field type
   * @param  {ES_FIELD_TYPES[]} esTypes - Array of ES data types
   * @return {FieldType}
   */
  getDefaultConfig = (fieldType: KBN_FIELD_TYPES, esTypes?: ES_FIELD_TYPES[]): FieldType => {
    const type = this.getDefaultTypeName(fieldType, esTypes);

    return (
      (this.defaultMap && this.defaultMap[type]) || { id: FIELD_FORMAT_IDS.STRING, params: {} }
    );
  };

  /**
   * Get a derived FieldFormat class by its id.
   *
   * @param  {IFieldFormatId} formatId - the format id
   * @return {FieldFormat | void}
   */
  getType = (formatId: IFieldFormatId): IFieldFormatType | void => {
    const fieldFormat = this.fieldFormats.get(formatId);

    if (fieldFormat) {
      const decoratedFieldFormat: any = this.fieldFormatMetaParamsDecorator(fieldFormat);

      if (decoratedFieldFormat) {
        return decoratedFieldFormat as IFieldFormatType;
      }
    }
  };

  /**
   * Get the default FieldFormat type (class) for
   * a field type, using the format:defaultTypeMap.
   * used by the field editor
   *
   * @param  {KBN_FIELD_TYPES} fieldType
   * @param  {ES_FIELD_TYPES[]} esTypes - Array of ES data types
   * @return {FieldFormat | void}
   */
  getDefaultType = (
    fieldType: KBN_FIELD_TYPES,
    esTypes: ES_FIELD_TYPES[]
  ): IFieldFormatType | void => {
    const config = this.getDefaultConfig(fieldType, esTypes);

    return this.getType(config.id);
  };

  /**
   * Get the name of the default type for ES types like date_nanos
   * using the format:defaultTypeMap config map
   *
   * @param  {ES_FIELD_TYPES[]} esTypes - Array of ES data types
   * @return {ES_FIELD_TYPES | void}
   */
  getTypeNameByEsTypes = (esTypes: ES_FIELD_TYPES[] | undefined): ES_FIELD_TYPES | void => {
    if (!Array.isArray(esTypes)) {
      return;
    }

    return esTypes.find(type => this.defaultMap[type] && this.defaultMap[type].es);
  };

  /**
   * Get the default FieldFormat type name for
   * a field type, using the format:defaultTypeMap.
   *
   * @param  {KBN_FIELD_TYPES} fieldType
   * @param  {ES_FIELD_TYPES[]} esTypes
   * @return {ES_FIELD_TYPES | String}
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
   * @param  {IFieldFormatId} formatId
   * @return {FIELD_FORMATS_INSTANCES[number]}
   */
  getInstance = memoize(
    (formatId: IFieldFormatId, params: Record<string, any> = {}): FieldFormat => {
      const DerivedFieldFormat = this.getType(formatId);

      if (!DerivedFieldFormat) {
        throw new Error(`Field Format '${formatId}' not found!`);
      }

      return new DerivedFieldFormat(params, this.getConfig);
    }
  );

  /**
   * Get the default fieldFormat instance for a field format.
   *
   * @param  {KBN_FIELD_TYPES} fieldType
   * @param  {ES_FIELD_TYPES[]} esTypes
   * @return {FieldFormat}
   */
  getDefaultInstancePlain(fieldType: KBN_FIELD_TYPES, esTypes?: ES_FIELD_TYPES[]): FieldFormat {
    const conf = this.getDefaultConfig(fieldType, esTypes);

    const DerivedFieldFormat = this.getType(conf.id);

    if (!DerivedFieldFormat) {
      throw new Error(`Field Format '${conf.id}' not found!`);
    }

    return new DerivedFieldFormat(conf.params, this.getConfig);
  }
  /**
   * Returns a cache key built by the given variables for caching in memoized
   * Where esType contains fieldType, fieldType is returned
   * -> kibana types have a higher priority in that case
   * -> would lead to failing tests that match e.g. date format with/without esTypes
   * https://lodash.com/docs#memoize
   *
   * @param  {KBN_FIELD_TYPES} fieldType
   * @param  {ES_FIELD_TYPES[]} esTypes
   * @return {String}
   */
  getDefaultInstanceCacheResolver(fieldType: KBN_FIELD_TYPES, esTypes: ES_FIELD_TYPES[]): string {
    // @ts-ignore
    return Array.isArray(esTypes) && esTypes.indexOf(fieldType) === -1
      ? [fieldType, ...esTypes].join('-')
      : fieldType;
  }

  /**
   * Get filtered list of field formats by format type
   *
   * @param  {KBN_FIELD_TYPES} fieldType
   * @return {FieldFormat[]}
   */
  getByFieldType(fieldType: KBN_FIELD_TYPES): IFieldFormatType[] {
    return [...this.fieldFormats.values()]
      .filter((format: IFieldFormatType) => format && format.fieldType.indexOf(fieldType) !== -1)
      .map(
        (format: IFieldFormatType) =>
          this.fieldFormatMetaParamsDecorator(format) as IFieldFormatType
      );
  }

  /**
   * Get the default fieldFormat instance for a field format.
   * It's a memoized function that builds and reads a cache
   *
   * @param  {KBN_FIELD_TYPES} fieldType
   * @param  {ES_FIELD_TYPES[]} esTypes
   * @return {FieldFormat}
   */
  getDefaultInstance = memoize(this.getDefaultInstancePlain, this.getDefaultInstanceCacheResolver);

  parseDefaultTypeMap(value: any) {
    this.defaultMap = value;
    forOwn(this, fn => {
      if (isFunction(fn) && fn.cache) {
        // clear all memoize caches
        // @ts-ignore
        fn.cache = new memoize.Cache();
      }
    });
  }

  register = (fieldFormats: IFieldFormatType[]) => {
    fieldFormats.forEach(fieldFormat => this.fieldFormats.set(fieldFormat.id, fieldFormat));

    return this;
  };

  /**
   * FieldFormat decorator - provide a one way to add meta-params for all field formatters
   *
   * @private
   * @param  {IFieldFormatType} fieldFormat - field format type
   * @return {FieldFormat | void}
   */
  private fieldFormatMetaParamsDecorator = (
    fieldFormat: IFieldFormatType
  ): IFieldFormatType | void => {
    const getMetaParams = (customParams: Record<string, any>) => this.buildMetaParams(customParams);

    if (fieldFormat) {
      return class DecoratedFieldFormat extends fieldFormat {
        static id = fieldFormat.id;
        static fieldType = fieldFormat.fieldType;

        constructor(params: Record<string, any> = {}, getConfig?: Function) {
          super(getMetaParams(params), getConfig);
        }
      };
    }
  };

  /**
   * Build Meta Params
   *
   * @static
   * @param  {Record<string, any>} custom params
   * @return {Record<string, any>}
   */
  private buildMetaParams = <T extends ...>(customParams: T = {}): T & {parsedUrl: ParsedUrl} => ({
    parsedUrl: {
      origin: window.location.origin,
      pathname: window.location.pathname,
      basePath: this.basePath,
    },
    ...customParams,
  });
}
