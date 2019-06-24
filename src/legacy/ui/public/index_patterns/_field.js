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

import { ObjDefine } from 'ui/utils/obj_define';
import { FieldFormat } from '../../field_formats/field_format';
import { fieldFormats } from 'ui/registry/field_formats';
import { getKbnFieldType } from '../../../utils';
import { shortenDottedString } from '../../../core_plugins/kibana/common/utils/shorten_dotted_string';
import { toastNotifications } from 'ui/notify';
import { i18n } from '@kbn/i18n';

export function Field(indexPattern, spec) {
  // unwrap old instances of Field
  if (spec instanceof Field) spec = spec.$$spec;

  // construct this object using ObjDefine class, which
  // extends the Field.prototype but gets it's properties
  // defined using the logic below
  const obj = new ObjDefine(spec, Field.prototype);

  if (spec.name === '_source') {
    spec.type = '_source';
  }

  const shortDotsEnable = indexPattern.shortDotsEnable;

  // find the type for this field, fallback to unknown type
  let type = getKbnFieldType(spec.type);
  if (spec.type && !type) {
    const title = i18n.translate('common.ui.indexPattern.unknownFieldHeader',
      { values: { type: spec.type }, defaultMessage: 'Unknown field type {type}' });
    const text = i18n.translate('common.ui.indexPattern.unknownFieldErrorMessage', {
      values: { name: spec.name, title: indexPattern.title },
      defaultMessage: 'Field {name} in indexPattern {title} is using an unknown field type.' });

    toastNotifications.addDanger({
      title,
      text,
    });
  }

  if (!type) type = getKbnFieldType('unknown');

  let format = spec.format;
  if (!format || !(format instanceof FieldFormat)) {
    format = indexPattern.fieldFormatMap[spec.name] || fieldFormats.getDefaultInstance(spec.type, spec.esTypes);
  }

  const indexed = !!spec.indexed;
  const scripted = !!spec.scripted;
  const searchable = !!spec.searchable || scripted;
  const aggregatable = !!spec.aggregatable || scripted;
  const readFromDocValues = !!spec.readFromDocValues && !scripted;
  const sortable = spec.name === '_score' || ((indexed || aggregatable) && type.sortable);
  const filterable = spec.name === '_id' || scripted || ((indexed || searchable) && type.filterable);
  const visualizable = aggregatable;

  obj.fact('name');
  obj.fact('type');
  obj.fact('esTypes');
  obj.writ('count', spec.count || 0);

  // scripted objs
  obj.fact('scripted', scripted);
  obj.writ('script', scripted ? spec.script : null);
  obj.writ('lang', scripted ? (spec.lang || 'painless') : null);

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
  obj.comp('$$spec', spec);

  // conflict info
  obj.writ('conflictDescriptions');

  // multi info
  obj.fact('parent');
  obj.fact('subType');

  return obj.create();
}

Object.defineProperties(Field.prototype, {
  indexed: {
    get() {
      throw new Error('field.indexed has been removed, see https://github.com/elastic/kibana/pull/11969');
    }
  },
  analyzed: {
    get() {
      throw new Error('field.analyzed has been removed, see https://github.com/elastic/kibana/pull/11969');
    }
  },
  doc_values: {
    get() {
      throw new Error('field.doc_values has been removed, see https://github.com/elastic/kibana/pull/11969');
    }
  },
});

Field.prototype.routes = {
  edit: '/management/kibana/index_patterns/{{indexPattern.id}}/field/{{name}}'
};
