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
import { KBN_FIELD_TYPES } from '../../kbn_field_types/types';
import { FieldFormat } from '../field_format';
import { TextContextTypeConvert, FIELD_FORMAT_IDS } from '../types';

export class IpFormat extends FieldFormat {
  static id = FIELD_FORMAT_IDS.IP;
  static title = i18n.translate('data.common.fieldFormats.ip.title', {
    defaultMessage: 'IP address',
  });
  static fieldType = KBN_FIELD_TYPES.IP;

  textConvert: TextContextTypeConvert = val => {
    if (val === undefined || val === null) return '-';
    if (!isFinite(val)) return val;

    // shazzam!
    // eslint-disable-next-line no-bitwise
    return [val >>> 24, (val >>> 16) & 0xff, (val >>> 8) & 0xff, val & 0xff].join('.');
  };
}
