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

import { identity } from 'lodash';

import { SerializedFieldFormat } from '../../../../expressions/common/types';

import { FieldFormat } from '../../../common';
import { FormatFactory } from '../../../common/field_formats/utils';
import { DataPublicPluginStart, IFieldFormat } from '../../../public';
import { getUiSettings } from '../../../public/services';
import { getFormatWithAggs } from '../../search/aggs/utils';

const getConfig = (key: string, defaultOverride?: any): any =>
  getUiSettings().get(key, defaultOverride);
const DefaultFieldFormat = FieldFormat.from(identity);

export const deserializeFieldFormat: FormatFactory = function (
  this: DataPublicPluginStart['fieldFormats'],
  serializedFieldFormat?: SerializedFieldFormat
) {
  if (!serializedFieldFormat) {
    return new DefaultFieldFormat();
  }

  const getFormat = (mapping: SerializedFieldFormat): IFieldFormat => {
    const { id, params = {} } = mapping;
    if (id) {
      const Format = this.getType(id);

      if (Format) {
        return new Format(params, getConfig);
      }
    }

    return new DefaultFieldFormat();
  };

  // decorate getFormat to handle custom types created by aggs
  const getFieldFormat = getFormatWithAggs(getFormat);

  return getFieldFormat(serializedFieldFormat);
};
