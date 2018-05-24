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

export class FieldFormatsService {
  constructor(fieldFormatClasses, getConfig) {
    this._fieldFormats = _.indexBy(fieldFormatClasses, 'id');
    this.getConfig = getConfig;
  }

  /**
   * Get the id of the default type for this field type
   * using the format:defaultTypeMap config map
   *
   * @param  {String} fieldType - the field type
   * @return {String}
   */
  getDefaultConfig(fieldType) {
    const defaultMap = this.getConfig('format:defaultTypeMap');
    return defaultMap[fieldType] || defaultMap._default_;
  }

  /**
   * Get the default fieldFormat instance for a field type.
   *
   * @param  {String} fieldType
   * @return {FieldFormat}
   */
  getDefaultInstance(fieldType) {
    const conf = this.getDefaultConfig(fieldType);
    const FieldFormat = this._fieldFormats[conf.id];
    return new FieldFormat(conf.params, this.getConfig);
  }

  /**
   * Get the fieldFormat instance for a field format configuration.
   *
   * @param  {Object} conf:id, conf:params
   * @return {FieldFormat}
   */
  getInstance(conf) {
    const FieldFormat = this._fieldFormats[conf.id];
    return new FieldFormat(conf.params, this.getConfig);
  }

  /**
   * Get a FieldFormat type (class) by it's id.
   *
   * @param  {String} fieldFormatId - the FieldFormat id
   * @return {FieldFormat}
   */
  getType(fieldFormatId) {
    return this._fieldFormats[fieldFormatId];
  }
}
