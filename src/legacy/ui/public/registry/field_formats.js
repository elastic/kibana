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

import { memoize, forOwn, isFunction } from 'lodash';
import { npStart } from 'ui/new_platform';
import { FieldFormat } from '../../../../plugins/data/common/field_formats';

class FieldFormatRegistry {
  constructor() {
    this.fieldFormats = new Map();
    this._uiSettings = npStart.core.uiSettings;
    this.getConfig = (...args) => this._uiSettings.get(...args);
    this._defaultMap = [];
    this.init();
  }

  init() {
    this.parseDefaultTypeMap(this._uiSettings.get('format:defaultTypeMap'));

    this._uiSettings.getUpdate$().subscribe(({ key, newValue }) => {
      if (key === 'format:defaultTypeMap') {
        this.parseDefaultTypeMap(newValue);
      }
    });
  }

  /**
   * Get the id of the default type for this field type
   * using the format:defaultTypeMap config map
   *
   * @param  {String} fieldType - the field type
   * @param  {String[]} esTypes - Array of ES data types
   * @return {Object}
   */
  getDefaultConfig = (fieldType, esTypes) => {
    const type = this.getDefaultTypeName(fieldType, esTypes);
    return this._defaultMap[type] || this._defaultMap._default_;
  };

  /**
   * Get a FieldFormat type (class) by it's id.
   *
   * @param  {String} formatId - the format id
   * @return {Function}
   */
  getType = formatId => {
    return this.fieldFormats.get(formatId);
  };
  /**
   * Get the default FieldFormat type (class) for
   * a field type, using the format:defaultTypeMap.
   * used by the field editor
   *
   * @param  {String} fieldType
   * @param  {String} esTypes - Array of ES data types
   * @return {Function}
   */
  getDefaultType = (fieldType, esTypes) => {
    const config = this.getDefaultConfig(fieldType, esTypes);
    return this.getType(config.id);
  };

  /**
   * Get the name of the default type for ES types like date_nanos
   * using the format:defaultTypeMap config map
   *
   * @param  {String[]} esTypes - Array of ES data types
   * @return {String|undefined}
   */
  getTypeNameByEsTypes = esTypes => {
    if (!Array.isArray(esTypes)) {
      return;
    }
    return esTypes.find(type => this._defaultMap[type] && this._defaultMap[type].es);
  };
  /**
   * Get the default FieldFormat type name for
   * a field type, using the format:defaultTypeMap.
   *
   * @param  {String} fieldType
   * @param  {String[]} esTypes
   * @return {string}
   */
  getDefaultTypeName = (fieldType, esTypes) => {
    return this.getTypeNameByEsTypes(esTypes) || fieldType;
  };

  /**
   * Get the singleton instance of the FieldFormat type by it's id.
   *
   * @param  {String} formatId
   * @return {FieldFormat}
   */
  getInstance = memoize(function(formatId) {
    const FieldFormat = this.getType(formatId);
    if (!FieldFormat) {
      throw new Error(`Field Format '${formatId}' not found!`);
    }
    return new FieldFormat(null, this.getConfig);
  });

  /**
   * Get the default fieldFormat instance for a field format.
   *
   * @param  {String} fieldType
   * @param  {String[]} esTypes
   * @return {FieldFormat}
   */
  getDefaultInstancePlain(fieldType, esTypes) {
    const conf = this.getDefaultConfig(fieldType, esTypes);

    const FieldFormat = this.getType(conf.id);
    return new FieldFormat(conf.params, this.getConfig);
  }
  /**
   * Returns a cache key built by the given variables for caching in memoized
   * Where esType contains fieldType, fieldType is returned
   * -> kibana types have a higher priority in that case
   * -> would lead to failing tests that match e.g. date format with/without esTypes
   * https://lodash.com/docs#memoize
   *
   * @param  {String} fieldType
   * @param  {String[]} esTypes
   * @return {string}
   */
  getDefaultInstanceCacheResolver(fieldType, esTypes) {
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

  getByFieldType(fieldType) {
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

  parseDefaultTypeMap(value) {
    this._defaultMap = value;
    forOwn(this, function(fn) {
      if (isFunction(fn) && fn.cache) {
        // clear all memoize caches
        fn.cache = new memoize.Cache();
      }
    });
  }

  register = module => {
    const fieldFormatInstance = module(FieldFormat);
    this.fieldFormats.set(fieldFormatInstance.id, fieldFormatInstance);
    return this;
  };
}

export const fieldFormats = new FieldFormatRegistry();
