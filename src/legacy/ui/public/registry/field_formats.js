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

import _ from 'lodash';
import chrome from '../chrome';
import { FieldFormat } from '../../field_formats/field_format';
import { IndexedArray } from '../indexed_array';

class FieldFormatRegistry extends IndexedArray {
  constructor() {
    super({
      group: ['fieldType'],
      index: ['id', 'name']
    });

    this._uiSettings = chrome.getUiSettingsClient();
    this.getConfig = (...args) => this._uiSettings.get(...args);
    this._defaultMap = [];
    this._providers = [];
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
  getType = (formatId) => {
    return this.byId[formatId];
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
    return this.byId[config.id];
  };

  /**
   * Get the name of the default type for ES types like date_nanos
   * using the format:defaultTypeMap config map
   *
   * @param  {String[]} esTypes - Array of ES data types
   * @return {String|undefined}
   */
  getTypeNameByEsTypes = (esTypes) => {
    if(!Array.isArray(esTypes)) {
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
  getInstance = _.memoize(function (formatId) {
    const FieldFormat = this.byId[formatId];
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

    const FieldFormat = this.byId[conf.id];
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
   * Get the default fieldFormat instance for a field format.
   * It's a memoized function that builds and reads a cache
   *
   * @param  {String} fieldType
   * @param  {String[]} esTypes
   * @return {FieldFormat}
   */
  getDefaultInstance = _.memoize(this.getDefaultInstancePlain, this.getDefaultInstanceCacheResolver);


  parseDefaultTypeMap(value) {
    this._defaultMap = value;
    _.forOwn(this, function (fn) {
      if (_.isFunction(fn) && fn.cache) {
        // clear all memoize caches
        fn.cache = new _.memoize.Cache();
      }
    });
  }

  name = 'fieldFormats';
  displayName = '[registry ' + this.name + ']';

  register = (module) => {
    this.push(module(FieldFormat));
    return this;
  };
}

export const fieldFormats = new FieldFormatRegistry();
