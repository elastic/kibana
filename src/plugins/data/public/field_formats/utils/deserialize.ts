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
import { i18n } from '@kbn/i18n';
import {
  convertDateRangeToString,
  DateRangeKey,
} from '../../../../../legacy/core_plugins/data/public/search/aggs/buckets/lib/date_range';
import {
  convertIPRangeToString,
  IpRangeKey,
} from '../../../../../legacy/core_plugins/data/public/search/aggs/buckets/lib/ip_range';
import { SerializedFieldFormat } from '../../../../expressions/common/types';
import { FieldFormatId, FieldFormatsContentType, IFieldFormat } from '../..';
import { FieldFormat } from '../../../common';
import { DataPublicPluginStart } from '../../../public';
import { getUiSettings } from '../../../public/services';
import { FormatFactory } from '../../../common/field_formats/utils';

interface TermsFieldFormatParams {
  otherBucketLabel: string;
  missingBucketLabel: string;
  id: string;
}

function isTermsFieldFormat(
  serializedFieldFormat: SerializedFieldFormat
): serializedFieldFormat is SerializedFieldFormat<TermsFieldFormatParams> {
  return serializedFieldFormat.id === 'terms';
}

const getConfig = (key: string, defaultOverride?: any): any =>
  getUiSettings().get(key, defaultOverride);
const DefaultFieldFormat = FieldFormat.from(identity);

const getFieldFormat = (
  fieldFormatsService: DataPublicPluginStart['fieldFormats'],
  id?: FieldFormatId,
  params: object = {}
): IFieldFormat => {
  if (id) {
    const Format = fieldFormatsService.getType(id);

    if (Format) {
      return new Format(params, getConfig);
    }
  }

  return new DefaultFieldFormat();
};

export const deserializeFieldFormat: FormatFactory = function(
  this: DataPublicPluginStart['fieldFormats'],
  mapping?: SerializedFieldFormat
) {
  if (!mapping) {
    return new DefaultFieldFormat();
  }
  const { id } = mapping;
  if (id === 'range') {
    const RangeFormat = FieldFormat.from((range: any) => {
      const format = getFieldFormat(this, id, mapping.params);
      const gte = '\u2265';
      const lt = '\u003c';
      return i18n.translate('data.aggTypes.buckets.ranges.rangesFormatMessage', {
        defaultMessage: '{gte} {from} and {lt} {to}',
        values: {
          gte,
          from: format.convert(range.gte),
          lt,
          to: format.convert(range.lt),
        },
      });
    });
    return new RangeFormat();
  } else if (id === 'date_range') {
    const nestedFormatter = mapping.params as SerializedFieldFormat;
    const DateRangeFormat = FieldFormat.from((range: DateRangeKey) => {
      const format = getFieldFormat(this, nestedFormatter.id, nestedFormatter.params);
      return convertDateRangeToString(range, format.convert.bind(format));
    });
    return new DateRangeFormat();
  } else if (id === 'ip_range') {
    const nestedFormatter = mapping.params as SerializedFieldFormat;
    const IpRangeFormat = FieldFormat.from((range: IpRangeKey) => {
      const format = getFieldFormat(this, nestedFormatter.id, nestedFormatter.params);
      return convertIPRangeToString(range, format.convert.bind(format));
    });
    return new IpRangeFormat();
  } else if (isTermsFieldFormat(mapping) && mapping.params) {
    const { params } = mapping;
    const convert = (val: string, type: FieldFormatsContentType) => {
      const format = getFieldFormat(this, params.id, mapping.params);

      if (val === '__other__') {
        return params.otherBucketLabel;
      }
      if (val === '__missing__') {
        return params.missingBucketLabel;
      }

      return format.convert(val, type);
    };

    return {
      convert,
      getConverterFor: (type: FieldFormatsContentType) => (val: string) => convert(val, type),
    } as IFieldFormat;
  } else {
    return getFieldFormat(this, id, mapping.params);
  }
};
