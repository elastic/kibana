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

import { forOwn, isFunction, memoize } from 'lodash';
import { UiSettingsClientContract } from 'kibana/public';
import { FIELD_FORMATS_IDS } from './types';
import { ES_FIELD_TYPES, KBN_FIELD_TYPES, FieldFormat } from '../../common';

interface FieldType {
  id: FIELD_FORMATS_IDS;
  params: Record<string, any>;
  es?: boolean;
}

export class FieldFormatRegisty {
  private fieldFormats: Map<FIELD_FORMATS_IDS, typeof FieldFormat>;
  private uiSettings: UiSettingsClientContract;
  private getConfig: Function;
  private defaultMap: { [key in ES_FIELD_TYPES | KBN_FIELD_TYPES]?: FieldType } & {
    _default_: FieldType;
  };

  constructor(uiSettings: UiSettingsClientContract) {
    this.fieldFormats = new Map();
    this.uiSettings = uiSettings;
    this.getConfig = (key: string, override?: any) => this.uiSettings.get(key, override);
    this.defaultMap = {
      _default_: { id: FIELD_FORMATS_IDS.STRING, params: {} },
    };
    this.init();
  }

  init() {
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
  getDefaultConfig = (fieldType: KBN_FIELD_TYPES, esTypes: ES_FIELD_TYPES[]): FieldType => {
    const type = this.getDefaultTypeName(fieldType, esTypes);

    return this.defaultMap[type] || this.defaultMap._default_;
  };

  /**
   * Get a FieldFormat type (class) by its id.
   *
   * @param  {FIELD_FORMATS_IDS} formatId - the format id
   * @return {FieldFormat}
   */
  getType = (formatId: FIELD_FORMATS_IDS): typeof FieldFormat => {
    return this.fieldFormats.get(formatId) as typeof FieldFormat;
  };

  /**
   * Get the default FieldFormat type (class) for
   * a field type, using the format:defaultTypeMap.
   * used by the field editor
   *
   * @param  {KBN_FIELD_TYPES} fieldType
   * @param  {ES_FIELD_TYPES[]} esTypes - Array of ES data types
   * @return {FieldFormat}
   */
  getDefaultType = (fieldType: KBN_FIELD_TYPES, esTypes: ES_FIELD_TYPES[]): typeof FieldFormat => {
    const config = this.getDefaultConfig(fieldType, esTypes) as FieldType;

    return this.getType(config.id);
  };

  /**
   * Get the name of the default type for ES types like date_nanos
   * using the format:defaultTypeMap config map
   *
   * @param  {ES_FIELD_TYPES[]} esTypes - Array of ES data types
   * @return {ES_FIELD_TYPES | String}
   */
  getTypeNameByEsTypes = (esTypes: ES_FIELD_TYPES[]): ES_FIELD_TYPES | string => {
    if (!Array.isArray(esTypes)) {
      return '';
    }

    return esTypes.find(type => this.defaultMap[type] && this.defaultMap[type]!.es) || '';
  };

  /**
   * Get the default FieldFormat type name for
   * a field type, using the format:defaultTypeMap.
   *
   * @param  {KBN_FIELD_TYPES} fieldType
   * @param  {ES_FIELD_TYPES[]} esTypes
   * @return {KBN_FIELD_TYPES | ES_FIELD_TYPES}
   */
  getDefaultTypeName = (
    fieldType: KBN_FIELD_TYPES,
    esTypes: ES_FIELD_TYPES[]
  ): KBN_FIELD_TYPES | ES_FIELD_TYPES => {
    const esType = this.getTypeNameByEsTypes(esTypes) as ES_FIELD_TYPES;

    return esType || fieldType;
  };

  /**
   * Get the singleton instance of the FieldFormat type by its id.
   *
   * @param  {FIELD_FORMATS_IDS} formatId
   * @return {FieldFormat}
   */
  getInstance = memoize(
    (formatId: FIELD_FORMATS_IDS): FieldFormat => {
      const DerivedFieldFormat = this.getType(formatId);

      if (!DerivedFieldFormat) {
        throw new Error(`Field Format '${formatId}' not found!`);
      }

      // @ts-ignore
      return new DerivedFieldFormat({}, this.getConfig);
    }
  );

  /**
   * Get the default fieldFormat instance for a field format.
   *
   * @param  {KBN_FIELD_TYPES} fieldType
   * @param  {ES_FIELD_TYPES[]} esTypes
   * @return {FieldFormat}
   */
  getDefaultInstancePlain(fieldType: KBN_FIELD_TYPES, esTypes: ES_FIELD_TYPES[]) {
    const conf = this.getDefaultConfig(fieldType, esTypes) as FieldType;
    const DerivedFieldFormat = this.getType(conf.id);

    // @ts-ignore
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
   * @return {string}
   */
  getDefaultInstanceCacheResolver(fieldType: KBN_FIELD_TYPES, esTypes: ES_FIELD_TYPES[]) {
    // @ts-ignore
    return Array.isArray(esTypes) && esTypes.indexOf(fieldType) === -1
      ? [fieldType, ...esTypes].join('-')
      : fieldType;
  }

  /**
   * Get filtered list of field formats by format type
   *
   * @param  {String} fieldType
   * @return {FieldFormat[]}
   */
  getByFieldType(fieldType: KBN_FIELD_TYPES) {
    return [...this.fieldFormats.values()].filter(
      format => format.fieldType.indexOf(fieldType) !== -1
    );
  }

  /**
   * Get the default fieldFormat instance for a field format.
   * It's a memoized function that builds and reads a cache
   *
   * @param  {String} fieldType
   * @param  {String[]} esTypes
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

  // any = DerivedFieldFormat
  register = (fieldFormats: any[] = []) => {
    fieldFormats.forEach(fieldFormat => {
      this.fieldFormats.set(fieldFormat.id, fieldFormat);
    });

    return this;
  };
}
