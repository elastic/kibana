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

import { SerializedFieldFormat } from '../../../../../expressions/common/types';
import { FieldFormat } from '../../../../common';
import { FieldFormatsContentType, IFieldFormat } from '../../../../public';
import { convertDateRangeToString, DateRangeKey } from '../buckets/lib/date_range';
import { convertIPRangeToString, IpRangeKey } from '../buckets/lib/ip_range';

type GetFieldFormat = (mapping: SerializedFieldFormat) => IFieldFormat;

/**
 * Certain aggs have custom field formats that are not part of the field formats
 * registry. This function will take the `getFormat` function which is used inside
 * `deserializeFieldFormat` and decorate it with the additional custom formats
 * that the field formats service doesn't know anything about.
 *
 * This function is internal to the data plugin, and only exists for use inside
 * the field formats service.
 *
 * @internal
 */
export function getFormatWithAggs(getFieldFormat: GetFieldFormat): GetFieldFormat {
  return (mapping) => {
    const { id, params = {} } = mapping;

    const customFormats: Record<string, () => IFieldFormat> = {
      range: () => {
        const RangeFormat = FieldFormat.from((range: any) => {
          const nestedFormatter = params as SerializedFieldFormat;
          const format = getFieldFormat({
            id: nestedFormatter.id,
            params: nestedFormatter.params,
          });
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
      },
      date_range: () => {
        const nestedFormatter = params as SerializedFieldFormat;
        const DateRangeFormat = FieldFormat.from((range: DateRangeKey) => {
          const format = getFieldFormat({
            id: nestedFormatter.id,
            params: nestedFormatter.params,
          });
          return convertDateRangeToString(range, format.convert.bind(format));
        });
        return new DateRangeFormat();
      },
      ip_range: () => {
        const nestedFormatter = params as SerializedFieldFormat;
        const IpRangeFormat = FieldFormat.from((range: IpRangeKey) => {
          const format = getFieldFormat({
            id: nestedFormatter.id,
            params: nestedFormatter.params,
          });
          return convertIPRangeToString(range, format.convert.bind(format));
        });
        return new IpRangeFormat();
      },
      terms: () => {
        const convert = (val: string, type: FieldFormatsContentType) => {
          const format = getFieldFormat({ id: params.id, params });

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
      },
    };

    if (!id || !(id in customFormats)) {
      return getFieldFormat(mapping);
    }

    return customFormats[id]();
  };
}
