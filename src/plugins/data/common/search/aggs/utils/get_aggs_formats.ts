/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/* eslint-disable max-classes-per-file */
import { i18n } from '@kbn/i18n';

import {
  FieldFormat,
  FieldFormatInstanceType,
  FieldFormatParams,
  FieldFormatsContentType,
  IFieldFormat,
  SerializedFieldFormat,
} from '../../../../../field_formats/common';
import { DateRange } from '../../expressions';
import { convertDateRangeToString } from '../buckets/lib/date_range';
import { convertIPRangeToString, IpRangeKey } from '../buckets/lib/ip_range';
import { MultiFieldKey } from '../buckets/multi_field_key';

type GetFieldFormat = (mapping: SerializedFieldFormat) => IFieldFormat;

/**
 * Certain aggs have custom field formats that have dependency on aggs code.
 * This function creates such field formats types and then those are added to field formatters registry
 *
 * These formats can't be used from field format editor UI
 *
 * This function is internal to the data plugin, and only exists for use inside
 * the field formats service.
 *
 * @internal
 */
export function getAggsFormats(getFieldFormat: GetFieldFormat): FieldFormatInstanceType[] {
  return [
    class AggsRangeFieldFormat extends FieldFormat {
      static id = 'range';
      static hidden = true;

      textConvert = (range: any) => {
        const params = this._params;

        if (range == null) {
          return '';
        }

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
      };
    },
    class AggsDateRangeFieldFormat extends FieldFormat {
      static id = 'date_range';
      static hidden = true;

      textConvert = (range: DateRange) => {
        if (range == null) {
          return '';
        }

        const nestedFormatter = this._params as SerializedFieldFormat;
        const format = getFieldFormat({
          id: nestedFormatter.id,
          params: nestedFormatter.params,
        });
        return convertDateRangeToString(range, format.convert.bind(format));
      };
    },
    class AggsIpRangeFieldFormat extends FieldFormat {
      static id = 'ip_range';
      static hidden = true;

      textConvert = (range: IpRangeKey) => {
        if (range == null) {
          return '';
        }

        const nestedFormatter = this._params as SerializedFieldFormat;
        const format = getFieldFormat({
          id: nestedFormatter.id,
          params: nestedFormatter.params,
        });
        return convertIPRangeToString(range, format.convert.bind(format));
      };
    },
    class AggsTermsFieldFormat extends FieldFormat {
      static id = 'terms';
      static hidden = true;

      convert = (val: string, type: FieldFormatsContentType) => {
        const params = this._params;
        const format = getFieldFormat({ id: params.id, params });

        if (val === '__other__') {
          return params.otherBucketLabel;
        }
        if (val === '__missing__') {
          return params.missingBucketLabel;
        }

        return format.convert(val, type);
      };
      getConverterFor = (type: FieldFormatsContentType) => (val: string) => this.convert(val, type);
    },
    class AggsMultiTermsFieldFormat extends FieldFormat {
      static id = 'multi_terms';
      static hidden = true;

      private formatCache: Map<SerializedFieldFormat<FieldFormatParams>, FieldFormat> = new Map();

      convert = (val: unknown, type: FieldFormatsContentType) => {
        const params = this._params;
        const formats = (params.paramsPerField as SerializedFieldFormat[]).map((fieldParams) => {
          const isCached = this.formatCache.has(fieldParams);
          const cachedFormat = this.formatCache.get(fieldParams) || getFieldFormat(fieldParams);
          if (!isCached) {
            this.formatCache.set(fieldParams, cachedFormat);
          }
          return cachedFormat;
        });

        if (String(val) === '__other__') {
          return params.otherBucketLabel;
        }

        const joinTemplate = params.separator ?? ' › ';

        return (val as MultiFieldKey).keys
          .map((valPart, i) => formats[i].convert(valPart, type))
          .join(joinTemplate);
      };
      getConverterFor = (type: FieldFormatsContentType) => (val: string) => this.convert(val, type);
    },
  ];
}
