/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/* eslint-disable max-classes-per-file */
import React from 'react';
import { i18n } from '@kbn/i18n';

import type {
  FieldFormatInstanceType,
  IFieldFormat,
  ReactConvertFunction,
  SerializedFieldFormat,
} from '@kbn/field-formats-plugin/common';
import { FieldFormat } from '@kbn/field-formats-plugin/common';
import type { SerializableRecord } from '@kbn/utility-types';
import { MISSING_TOKEN } from '@kbn/field-formats-common';
import type { DateRange } from '../../expressions';
import { convertDateRangeToString } from '../buckets/lib/date_range';
import type { IpPrefixKey } from '../buckets/lib/ip_prefix';
import { convertIPPrefixToString } from '../buckets/lib/ip_prefix';
import type { IpRangeKey } from '../buckets/lib/ip_range';
import { convertIPRangeToString } from '../buckets/lib/ip_range';
import type { MultiFieldKey } from '../buckets/multi_field_key';

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
  class FieldFormatWithCache extends FieldFormat {
    protected formatCache: Map<SerializedFieldFormat, FieldFormat> = new Map();

    protected getCachedFormat(fieldParams: SerializedFieldFormat<{}, SerializableRecord>) {
      const isCached = this.formatCache.has(fieldParams);
      const cachedFormat = this.formatCache.get(fieldParams) || getFieldFormat(fieldParams);
      if (!isCached) {
        this.formatCache.set(fieldParams, cachedFormat);
      }
      return cachedFormat;
    }
  }

  return [
    class AggsRangeFieldFormat extends FieldFormatWithCache {
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
        const format = this.getCachedFormat(nestedFormatter);

        const gte = '\u2265';
        const lt = '\u003c';
        let fromValue = format.convertToText(range.gte);
        let toValue = format.convertToText(range.lt);
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
    class AggsDateRangeFieldFormat extends FieldFormatWithCache {
      static id = 'date_range';
      static hidden = true;

      textConvert = (range: DateRange) => {
        if (range == null) {
          return '';
        }

        const nestedFormatter = this._params as SerializedFieldFormat;
        const format = this.getCachedFormat(nestedFormatter);
        return convertDateRangeToString(range, (v) => format.convertToText(v));
      };
    },
    class AggsIpPrefixFieldFormat extends FieldFormatWithCache {
      static id = 'ip_prefix';
      static hidden = true;

      textConvert = (cidr: IpPrefixKey) => {
        if (cidr == null) {
          return '';
        }

        const nestedFormatter = this._params as SerializedFieldFormat;
        const format = this.getCachedFormat(nestedFormatter);
        return convertIPPrefixToString(cidr, (v) => format.convertToText(v));
      };
    },
    class AggsIpRangeFieldFormat extends FieldFormatWithCache {
      static id = 'ip_range';
      static hidden = true;

      textConvert = (range: IpRangeKey) => {
        if (range == null) {
          return '';
        }

        const nestedFormatter = this._params as SerializedFieldFormat;
        const format = this.getCachedFormat(nestedFormatter);
        return convertIPRangeToString(range, (v) => format.convertToText(v));
      };
    },
    class AggsTermsFieldFormat extends FieldFormatWithCache {
      static id = 'terms';
      static hidden = true;

      private getSpecialBucketLabel(val: unknown): string | null {
        const { otherBucketLabel, missingBucketLabel } = this._params;
        if (val === '__other__' && otherBucketLabel) {
          return `${otherBucketLabel}`;
        }
        if (val === MISSING_TOKEN && missingBucketLabel) {
          return `${missingBucketLabel}`;
        }
        return null;
      }

      private getNestedFormat() {
        return this.getCachedFormat(this._params as SerializedFieldFormat<{}, SerializableRecord>);
      }

      convertToText = (val: unknown) => {
        return this.getSpecialBucketLabel(val) ?? this.getNestedFormat().convertToText(val);
      };

      reactConvert: ReactConvertFunction = (val, options) => {
        return (
          this.getSpecialBucketLabel(val) ?? this.getNestedFormat().convertToReact(val, options)
        );
      };
    },
    class AggsMultiTermsFieldFormat extends FieldFormatWithCache {
      static id = 'multi_terms';
      static hidden = true;

      private getSpecialBucketLabel(val: unknown): string | null {
        const { otherBucketLabel } = this._params;
        if (String(val) === '__other__' && otherBucketLabel) {
          return `${otherBucketLabel}`;
        }
        return null;
      }

      private getNestedFormats() {
        return (this._params.paramsPerField as SerializedFieldFormat[]).map((fieldParams) =>
          this.getCachedFormat(fieldParams)
        );
      }

      private getSeparator(): string {
        return String(this._params.separator ?? ' › ');
      }

      convertToText = (val: unknown) => {
        const otherLabel = this.getSpecialBucketLabel(val);
        if (otherLabel) return otherLabel;

        const keys = (val as unknown as MultiFieldKey)?.keys;
        if (!keys) return '';

        const formats = this.getNestedFormats();
        return keys
          .map((valPart, i) => formats[i].convertToText(valPart))
          .join(this.getSeparator());
      };

      reactConvert: ReactConvertFunction = (val, options) => {
        const otherLabel = this.getSpecialBucketLabel(val);
        if (otherLabel) return otherLabel;

        const keys = (val as unknown as MultiFieldKey)?.keys;
        if (!keys) return '';

        const formats = this.getNestedFormats();
        const separator = this.getSeparator();

        return (
          <>
            {keys.map((valPart, i) => (
              <React.Fragment key={i}>
                {i > 0 ? separator : null}
                {formats[i].convertToReact(valPart, options)}
              </React.Fragment>
            ))}
          </>
        );
      };
    },
  ];
}
