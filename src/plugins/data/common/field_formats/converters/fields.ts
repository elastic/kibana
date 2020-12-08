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

import { keys } from 'lodash';
import { doTemplate, SourceFormat } from './source';
import { FIELD_FORMAT_IDS, HtmlContextTypeConvert } from '../types';
import { KBN_FIELD_TYPES } from '../../kbn_field_types/types';
import { shortenDottedString } from '../../utils';

export class FieldsFormat extends SourceFormat {
  static id = FIELD_FORMAT_IDS.FIELDS;
  static title = 'fields';
  static fieldType = KBN_FIELD_TYPES._SOURCE;

  htmlConvert: HtmlContextTypeConvert = (value, options = {}) => {
    const { hit, indexPattern } = options;

    const highlights = (hit && hit.highlight) || {};
    const formatted = indexPattern.formatHit(hit);
    const highlightPairs: any[] = [];
    const sourcePairs: any[] = [];
    const isShortDots = false;

    keys(formatted).forEach((key) => {
      const pairs = highlights[key] ? highlightPairs : sourcePairs;
      const newField = isShortDots ? shortenDottedString(key) : key;
      const val = formatted[key];
      pairs.push([newField, val]);
    }, []);

    return doTemplate({ defPairs: highlightPairs.concat(sourcePairs) });
  };
}
