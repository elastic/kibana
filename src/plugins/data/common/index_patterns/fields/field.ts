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

import { i18n } from '@kbn/i18n';
// @ts-ignore
import { ObjDefine } from './obj_define';
import { IIndexPattern } from '../../types';
import {
  IFieldType,
  getKbnFieldType,
  IFieldSubType,
  FieldFormat,
  shortenDottedString,
} from '../../../common';
import {
  OnNotification,
  FieldSpec,
  FieldSpecConflictDescriptions,
  FieldSpecExportFmt,
} from '../types';
import { FieldFormatsStartCommon } from '../../field_formats';

interface FieldDependencies {
  fieldFormats: FieldFormatsStartCommon;
  onNotification: OnNotification;
}

export class Field implements IFieldType {
  name: string;
  type: string;
  script?: string;
  lang?: string;
  count?: number;
  // esTypes might be undefined on old index patterns that have not been refreshed since we added
  // this prop. It is also undefined on scripted fields.
  esTypes?: string[];
  aggregatable?: boolean;
  filterable?: boolean;
  searchable?: boolean;
  sortable?: boolean;
  visualizable?: boolean;
  scripted?: boolean;
  subType?: IFieldSubType;
  displayName?: string;
  indexPattern?: IIndexPattern;
  readFromDocValues?: boolean;
  format: any;
  $$spec: FieldSpec;
  conflictDescriptions?: FieldSpecConflictDescriptions;

  constructor(
    indexPattern: IIndexPattern,
    spec: FieldSpecExportFmt | FieldSpec | Field,
    shortDotsEnable: boolean,
    { fieldFormats, onNotification }: FieldDependencies
  ) {
    // unwrap old instances of Field
    if (spec instanceof Field) spec = spec.$$spec;

    // construct this object using ObjDefine class, which
    // extends the Field.prototype but gets it's properties
    // defined using the logic below
    const obj = new ObjDefine(spec, Field.prototype);

    if (spec.name === '_source') {
      spec.type = '_source';
    }

    // find the type for this field, fallback to unknown type
    let type = getKbnFieldType(spec.type);
    if (spec.type && !type) {
      const title = i18n.translate('data.indexPatterns.unknownFieldHeader', {
        values: { type: spec.type },
        defaultMessage: 'Unknown field type {type}',
      });
      const text = i18n.translate('data.indexPatterns.unknownFieldErrorMessage', {
        values: { name: spec.name, title: indexPattern.title },
        defaultMessage: 'Field {name} in indexPattern {title} is using an unknown field type.',
      });
      onNotification({ title, text, color: 'danger', iconType: 'alert' });
    }

    if (!type) type = getKbnFieldType('unknown');

    let format: any = spec.format;

    if (!FieldFormat.isInstanceOfFieldFormat(format)) {
      format =
        (indexPattern.fieldFormatMap && indexPattern.fieldFormatMap[spec.name]) ||
        fieldFormats.getDefaultInstance(spec.type, spec.esTypes);
    }

    const indexed = !!spec.indexed;
    const scripted = !!spec.scripted;
    const searchable = !!spec.searchable || scripted;
    const aggregatable = !!spec.aggregatable || scripted;
    const readFromDocValues = !!spec.readFromDocValues && !scripted;
    const sortable = spec.name === '_score' || ((indexed || aggregatable) && type && type.sortable);
    const filterable =
      spec.name === '_id' || scripted || ((indexed || searchable) && type && type.filterable);
    const visualizable = aggregatable;

    this.name = '';
    obj.fact('name');
    this.type = '';
    obj.fact('type');
    obj.fact('esTypes');
    obj.writ('count', spec.count || 0);

    // scripted objs
    obj.fact('scripted', scripted);
    obj.writ('script', scripted ? spec.script : null);
    obj.writ('lang', scripted ? spec.lang || 'painless' : null);

    // stats
    obj.fact('searchable', searchable);
    obj.fact('aggregatable', aggregatable);
    obj.fact('readFromDocValues', readFromDocValues);

    // usage flags, read-only and won't be saved
    obj.comp('format', format);
    obj.comp('sortable', sortable);
    obj.comp('filterable', filterable);
    obj.comp('visualizable', visualizable);

    // computed values
    obj.comp('indexPattern', indexPattern);
    obj.comp('displayName', shortDotsEnable ? shortenDottedString(spec.name) : spec.name);
    this.$$spec = spec;
    obj.comp('$$spec', spec);

    // conflict info
    obj.writ('conflictDescriptions');

    // multi info
    obj.fact('subType');

    const newObj = obj.create();
    newObj.toSpec = function () {
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
        format: this.indexPattern?.fieldFormatMap[this.name]?.toJSON() || undefined,
      };
    };
    return newObj;
  }
  // only providing type info as constructor returns new object instead of `this`
  toSpec = () => (({} as unknown) as FieldSpecExportFmt);
}
