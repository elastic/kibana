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

import { KbnFieldType, getKbnFieldType } from '../../kbn_field_types';
import { IFieldType } from './types';
import { FieldSpec, IndexPattern } from '../..';

export class IndexPatternField implements IFieldType {
  readonly spec: FieldSpec;
  // not writable or serialized
  readonly displayName: string;
  private readonly kbnFieldType: KbnFieldType;

  constructor(spec: FieldSpec, displayName: string) {
    this.spec = { ...spec, type: spec.name === '_source' ? '_source' : spec.type };
    this.displayName = displayName;

    this.kbnFieldType = getKbnFieldType(spec.type);
  }

  // writable attrs
  /**
   * Count is used for field popularity
   */
  public get count() {
    return this.spec.count || 0;
  }

  public set count(count) {
    this.spec.count = count;
  }

  /**
   * Script field code
   */
  public get script() {
    return this.spec.script;
  }

  public set script(script) {
    this.spec.script = script;
  }

  /**
   * Script field language
   */
  public get lang() {
    return this.spec.lang;
  }

  public set lang(lang) {
    this.spec.lang = lang;
  }

  /**
   * Description of field type conflicts across different indices in the same index pattern
   */
  public get conflictDescriptions() {
    return this.spec.conflictDescriptions;
  }

  public set conflictDescriptions(conflictDescriptions) {
    this.spec.conflictDescriptions = conflictDescriptions;
  }

  // read only attrs
  public get name() {
    return this.spec.name;
  }

  public get type() {
    return this.spec.type;
  }

  public get esTypes() {
    return this.spec.esTypes;
  }

  public get scripted() {
    return !!this.spec.scripted;
  }

  public get searchable() {
    return !!(this.spec.searchable || this.scripted);
  }

  public get aggregatable() {
    return !!(this.spec.aggregatable || this.scripted);
  }

  public get readFromDocValues() {
    return !!(this.spec.readFromDocValues && !this.scripted);
  }

  public get subType() {
    return this.spec.subType;
  }

  // not writable, not serialized
  public get sortable() {
    return (
      this.name === '_score' ||
      ((this.spec.indexed || this.aggregatable) && this.kbnFieldType.sortable)
    );
  }

  public get filterable() {
    return (
      this.name === '_id' ||
      this.scripted ||
      ((this.spec.indexed || this.searchable) && this.kbnFieldType.filterable)
    );
  }

  public get visualizable() {
    return this.aggregatable;
  }

  public toJSON() {
    return {
      count: this.count,
      script: this.script,
      lang: this.lang,
      conflictDescriptions: this.conflictDescriptions,

      name: this.name,
      type: this.type,
      esTypes: this.esTypes,
      scripted: this.scripted,
      searchable: this.searchable,
      aggregatable: this.aggregatable,
      readFromDocValues: this.readFromDocValues,
      subType: this.subType,
    };
  }

  public toSpec({
    getFormatterForField,
  }: {
    getFormatterForField?: IndexPattern['getFormatterForField'];
  } = {}): FieldSpec {
    return {
      count: this.count,
      script: this.script,
      lang: this.lang,
      conflictDescriptions: this.conflictDescriptions,
      name: this.name,
      type: this.type,
      esTypes: this.esTypes,
      scripted: this.scripted,
      searchable: this.searchable,
      aggregatable: this.aggregatable,
      readFromDocValues: this.readFromDocValues,
      subType: this.subType,
      format: getFormatterForField ? getFormatterForField(this).toJSON() : undefined,
    };
  }
}
