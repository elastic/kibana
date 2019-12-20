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
import { AggConfig, Vis } from 'ui/vis';
import { SerializedFieldFormat } from 'src/plugins/expressions/common/expressions/types/common';

import { FieldFormat } from '../../../../../../plugins/data/common/field_formats';

import { tabifyGetColumns } from '../../../agg_response/tabify/_get_columns';
import chrome from '../../../chrome';
// @ts-ignore
import { fieldFormats } from '../../../registry/field_formats';
import { dateRange } from '../../../utils/date_range';
import { ipRange } from '../../../utils/ip_range';
import { DateRangeKey } from '../../../agg_types/buckets/date_range';
import { IpRangeKey } from '../../../agg_types/buckets/ip_range';

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

const config = chrome.getUiSettingsClient();

const getConfig = (...args: any[]): any => config.get(...args);
const getDefaultFieldFormat = () => ({ convert: identity, getConverterFor: () => identity });

const getFieldFormat = (id: string | undefined, params: object = {}) => {
  const Format = fieldFormats.getType(id);
  if (Format) {
    return new Format(params, getConfig);
  } else {
    return getDefaultFieldFormat();
  }
};

export const createFormat = (agg: AggConfig): SerializedFieldFormat => {
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

export const getFormat: FormatFactory = (mapping = {}) => {
  if (!mapping) {
    return getDefaultFieldFormat();
  }
  const { id } = mapping;
  if (id === 'range') {
    const RangeFormat = FieldFormat.from((range: any) => {
      const format = getFieldFormat(id, mapping.params);
      const gte = '\u2265';
      const lt = '\u003c';
      return i18n.translate('common.ui.aggTypes.buckets.ranges.rangesFormatMessage', {
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
      const format = getFieldFormat(nestedFormatter.id, nestedFormatter.params);
      return dateRange.toString(range, format.convert.bind(format));
    });
    return new DateRangeFormat();
  } else if (id === 'ip_range') {
    const nestedFormatter = mapping.params as SerializedFieldFormat;
    const IpRangeFormat = FieldFormat.from((range: IpRangeKey) => {
      const format = getFieldFormat(nestedFormatter.id, nestedFormatter.params);
      return ipRange.toString(range, format.convert.bind(format));
    });
    return new IpRangeFormat();
  } else if (isTermsFieldFormat(mapping) && mapping.params) {
    const { params } = mapping;
    const convert = (val: string, type: string) => {
      if (val === '__other__') {
        return params.otherBucketLabel;
      }
      if (val === '__missing__') {
        return params.missingBucketLabel;
      }

      const format = getFieldFormat(params.id, params);
      const parsedUrl = {
        origin: window.location.origin,
        pathname: window.location.pathname,
        basePath: chrome.getBasePath(),
      };

      return format.getConverterFor(type)(val, undefined, undefined, parsedUrl);
    };

    return {
      getConverterFor: (type: string) => (val: string) => convert(val, type),
      convert,
    };
  } else {
    return getFieldFormat(id, mapping.params);
  }
};

export const getTableAggs = (vis: Vis): AggConfig[] => {
  if (!vis.aggs || !vis.aggs.getResponseAggs) {
    return [];
  }
  const columns = tabifyGetColumns(vis.aggs.getResponseAggs(), !vis.isHierarchical());
  return columns.map(c => c.aggConfig);
};

export { FieldFormat };
