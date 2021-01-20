/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { i18n } from '@kbn/i18n';

import { SerializedFieldFormat } from 'src/plugins/expressions/common/types';
import {
  FieldFormat,
  FieldFormatsContentType,
  IFieldFormat,
} from '../../../../common/field_formats';
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
          if (range.label) {
            return range.label;
          }
          const nestedFormatter = params as SerializedFieldFormat;
          const format = getFieldFormat({
            id: nestedFormatter.id,
            params: nestedFormatter.params,
          });

          const gte = '\u2265';
          const lt = '\u003c';
          let fromValue = format.convert(range.gte);
          let toValue = format.convert(range.lt);
          // In case of identity formatter and a specific flag, replace Infinity values by specific strings
          if (params.replaceInfinity && nestedFormatter.id == null) {
            const FROM_PLACEHOLDER = '\u2212\u221E';
            const TO_PLACEHOLDER = '+\u221E';
            fromValue = isFinite(range.gte) ? fromValue : FROM_PLACEHOLDER;
            toValue = isFinite(range.lt) ? toValue : TO_PLACEHOLDER;
          }

          if (params.template === 'arrow_right') {
            return i18n.translate('data.aggTypes.buckets.ranges.rangesFormatMessageArrowRight', {
              defaultMessage: '{from} → {to}',
              values: {
                from: fromValue,
                to: toValue,
              },
            });
          }
          return i18n.translate('data.aggTypes.buckets.ranges.rangesFormatMessage', {
            defaultMessage: '{gte} {from} and {lt} {to}',
            values: {
              gte,
              from: fromValue,
              lt,
              to: toValue,
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
