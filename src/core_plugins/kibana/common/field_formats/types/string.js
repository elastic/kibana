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

import { asPrettyString } from '../../utils/as_pretty_string';
import { shortenDottedString } from '../../utils/shorten_dotted_string';

const TRANSFORM_OPTIONS = [
  { kind: false, text: '- None -' },
  { kind: 'lower', text: 'Lower Case' },
  { kind: 'upper', text: 'Upper Case' },
  { kind: 'title', text: 'Title Case' },
  { kind: 'short', text: 'Short Dots' },
  { kind: 'base64', text: 'Base64 Decode' }
];
const DEFAULT_TRANSFORM_OPTION = false;

export function createStringFormat(FieldFormat) {
  return class StringFormat extends FieldFormat {
    getParamDefaults() {
      return {
        transform: DEFAULT_TRANSFORM_OPTION
      };
    }

    _base64Decode(val) {
      try {
        return Buffer.from(val, 'base64').toString('utf8');
      } catch (e) {
        return asPrettyString(val);
      }
    }

    _toTitleCase(val) {
      return val.replace(/\w\S*/g, txt => { return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase(); });
    }

    _convert(val) {
      switch (this.param('transform')) {
        case 'lower': return String(val).toLowerCase();
        case 'upper': return String(val).toUpperCase();
        case 'title': return this._toTitleCase(val);
        case 'short': return shortenDottedString(val);
        case 'base64': return this._base64Decode(val);
        default: return asPrettyString(val);
      }
    }

    static id = 'string';
    static title = 'String';
    static fieldType = [
      'number',
      'boolean',
      'date',
      'ip',
      'attachment',
      'geo_point',
      'geo_shape',
      'string',
      'murmur3',
      'unknown',
      'conflict'
    ];
    static transformOptions = TRANSFORM_OPTIONS;
  };
}
