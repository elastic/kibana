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
import { identity } from 'lodash';
import { SerializedFieldFormat } from 'src/plugins/expressions/public';
import { AggConfig } from '../../../legacy_imports';
/* eslint-disable @kbn/eslint/no-restricted-paths */
import {
  DateRangeKey,
  convertDateRangeToString,
} from '../../../../../../ui/public/agg_types/buckets/date_range';
import {
  IpRangeKey,
  convertIPRangeToString,
} from '../../../../../../ui/public/agg_types/buckets/ip_range';
/* eslint-enable @kbn/eslint/no-restricted-paths */
import { FieldFormat, ContentType } from '../../../../../../../plugins/data/common';
import { getFieldFormats } from '../services';

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

const DefaultFieldFormat = FieldFormat.from(identity);

export const getSerializedFieldFormat = (agg: AggConfig): SerializedFieldFormat => {
  const format: SerializedFieldFormat = agg.params.field ? agg.params.field.format.toJSON() : {};
  const formats: Record<string, () => SerializedFieldFormat> = {
    date_range: () => ({ id: 'date_range', params: format }),
    ip_range: () => ({ id: 'ip_range', params: format }),
    percentile_ranks: () => ({ id: 'percent' }),
    count: () => ({ id: 'number' }),
    cardinality: () => ({ id: 'number' }),
    date_histogram: () => ({
      id: 'date',
      params: {
        pattern: (agg as any).buckets.getScaledDateFormat(),
      },
    }),
    terms: () => ({
      id: 'terms',
      params: {
        id: format.id,
        otherBucketLabel: agg.params.otherBucketLabel,
        missingBucketLabel: agg.params.missingBucketLabel,
        ...format.params,
      },
    }),
    range: () => ({
      id: 'range',
      params: { id: format.id, ...format.params },
    }),
  };

  return formats[agg.type.name] ? formats[agg.type.name]() : format;
};

export type FormatFactory = (mapping?: SerializedFieldFormat) => FieldFormat;

export const unserializeFieldFormat: FormatFactory = mapping => {
  if (!mapping) {
    return new DefaultFieldFormat();
  }
  const { id } = mapping;
  if (id === 'range') {
    const RangeFormat = FieldFormat.from((range: any) => {
      const format = getFieldFormats().getInstance(id, mapping.params);
      const gte = '\u2265';
      const lt = '\u003c';
      return i18n.translate('visualizations.fieldFormatUtils.rangesFormatMessage', {
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
      const format = getFieldFormats().getInstance(
        nestedFormatter.id as string,
        nestedFormatter.params
      );
      return convertDateRangeToString(range, format.convert.bind(format));
    });
    return new DateRangeFormat();
  } else if (id === 'ip_range') {
    const nestedFormatter = mapping.params as SerializedFieldFormat;
    const IpRangeFormat = FieldFormat.from((range: IpRangeKey) => {
      const format = getFieldFormats().getInstance(
        nestedFormatter.id as string,
        nestedFormatter.params
      );
      return convertIPRangeToString(range, format.convert.bind(format));
    });
    return new IpRangeFormat();
  } else if (isTermsFieldFormat(mapping) && mapping.params) {
    const { params } = mapping;
    const convert = (val: string, type: ContentType) => {
      const format = getFieldFormats().getInstance(params.id, mapping.params);

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
      getConverterFor: (type: ContentType) => (val: string) => convert(val, type),
    } as FieldFormat;
  } else {
    return getFieldFormats().getInstance(id as string, mapping.params);
  }
};
